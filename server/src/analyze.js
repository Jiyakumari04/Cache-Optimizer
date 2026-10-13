const router = require("express").Router();
const dns = require("dns").promises;
const net = require("net");
const { z } = require("zod");
const db = require("./db");
const { requireAuth } = require("./middleware");

// SSRF guard: this app fetches URLs for users, so it must never reach internal networks.
function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
  return (
    v === "::1" ||
    v === "::" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe80")
  );
}

const body = z.object({ url: z.string().trim().url().max(2048) });

function grade(h) {
  const items = [];
  let score = 100;
  const add = (level, msg, cost) => {
    items.push({ level, msg });
    score -= cost;
  };
  const cc = (h["cache-control"] || "").toLowerCase();
  if (!cc && !h.expires)
    add(
      "fail",
      "No Cache-Control or Expires header. Browsers and CDNs will guess.",
      40,
    );
  if (cc.includes("no-store"))
    add("fail", "no-store disables all caching for this response.", 40);
  if (cc && !/max-age|s-maxage/.test(cc) && !cc.includes("no-store"))
    add("warn", "Cache-Control has no max-age or s-maxage.", 15);
  const m = cc.match(/max-age=(\d+)/);
  if (m && Number(m[1]) < 60)
    add(
      "warn",
      `max-age is ${m[1]} seconds. Very short lifetimes cause frequent refetching.`,
      10,
    );
  if (!h.etag && !h["last-modified"])
    add(
      "warn",
      "No ETag or Last-Modified. Clients cannot revalidate cheaply with a 304.",
      15,
    );
  if (!h["content-encoding"])
    add("warn", "Response is not compressed (no gzip or br).", 10);
  if (h.vary && h.vary.trim() === "*")
    add("fail", "Vary: * makes the response uncacheable by shared caches.", 20);
  if (cc.includes("private") && !cc.includes("no-store"))
    items.push({
      level: "info",
      msg: "Marked private: shared caches and CDNs will skip it.",
    });
  if (!items.length)
    items.push({ level: "pass", msg: "Caching headers look sound." });
  return { score: Math.max(0, score), items };
}

router.post("/", requireAuth, async (req, res) => {
  const p = body.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: "Enter a valid http or https URL" });
  let u;
  try {
    u = new URL(p.data.url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    return res
      .status(400)
      .json({ error: "Only plain http or https URLs are allowed" });
  if (!["", "80", "443"].includes(u.port))
    return res.status(400).json({ error: "Only ports 80 and 443 are allowed" });
  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivate(a.address)))
      return res.status(400).json({ error: "That address is not allowed" });
    const r = await fetch(u.href, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "CacheOptimizerBot/1.0",
        "Accept-Encoding": "gzip, br",
      },
    });
    await r.body?.cancel();
    const h = Object.fromEntries(r.headers.entries());
    const picked = {};
    for (const k of [
      "cache-control",
      "expires",
      "etag",
      "last-modified",
      "vary",
      "age",
      "content-encoding",
    ])
      if (h[k]) picked[k] = String(h[k]).slice(0, 300);
    const g = grade(h);
    if (r.status >= 300 && r.status < 400)
      g.items.unshift({
        level: "info",
        msg: `Server redirected (${r.status}). Redirects are not followed. Analyze the final URL.`,
      });
    const out = { url: u.href, status: r.status, headers: picked, ...g };
    db.prepare(
      "INSERT INTO analyses (user_id, url, score, result) VALUES (?, ?, ?, ?)",
    ).run(req.user.id, u.href, g.score, JSON.stringify(out));
    res.json(out);
  } catch {
    res.status(502).json({ error: "Could not reach that site" });
  }
});

router.get("/history", requireAuth, (req, res) => {
  res.json(
    db
      .prepare(
        "SELECT id, url, score, created_at FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT 50",
      )
      .all(req.user.id),
  );
});

module.exports = router;
