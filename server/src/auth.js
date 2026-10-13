const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const db = require("./db");
const { requireAuth } = require("./middleware");

const creds = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12, "Use at least 12 characters").max(128),
});

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 1000 * 60 * 60 * 8,
  path: "/",
};
const issue = (res, id) =>
  res.cookie(
    "session",
    jwt.sign({ id }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "8h",
    }),
    cookieOpts,
  );

// Pre-computed hash so a missing account takes as long as a wrong password
const DUMMY = bcrypt.hashSync("not-a-real-password", 12);

router.post("/register", (req, res) => {
  const p = creds.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: p.error.issues[0].message });
  const { email, password } = p.data;
  const role =
    process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()
      ? "admin"
      : "user";
  try {
    const info = db
      .prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      )
      .run(email, bcrypt.hashSync(password, 12), role);
    issue(res, info.lastInsertRowid);
    res.status(201).json({ email, role });
  } catch {
    res.status(400).json({ error: "Could not create account" });
  }
});

router.post("/login", (req, res) => {
  const p = creds.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: "Invalid email or password" });
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(p.data.email);
  const ok = bcrypt.compareSync(p.data.password, u ? u.password_hash : DUMMY);
  if (!u || !ok)
    return res.status(401).json({ error: "Invalid email or password" });
  issue(res, u.id);
  res.json({ email: u.email, role: u.role });
});

router.post("/logout", (req, res) => {
  res.clearCookie("session", { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => res.json(req.user));

module.exports = router;
