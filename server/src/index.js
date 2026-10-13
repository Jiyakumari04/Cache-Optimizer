require("dotenv").config();
for (const k of ["JWT_SECRET", "CLIENT_ORIGIN"]) {
  if (!process.env[k]) {
    console.error(`Missing required env variable: ${k}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { requireJson } = require("./middleware");

const app = express();
const prod = process.env.NODE_ENV === "production";
app.disable("x-powered-by");
app.set("trust proxy", 1); // required behind Nginx or a host proxy so rate limits see real IPs

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  }),
);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(requireJson);
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  "/api/auth/register",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  "/api/analyze",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use("/api/auth", require("./auth"));
app.use("/api/analyze", require("./analyze"));
app.use("/api/admin", require("./admin"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

if (prod) {
  const dist = path.join(__dirname, "../../client/dist");
  app.use(
    express.static(dist, {
      dotfiles: "deny",
      index: false,
      maxAge: "1y",
      setHeaders: (r, f) => {
        if (f.endsWith(".html")) r.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, req, res, next) => {
  // never leak stack traces
  console.error(err.message);
  res.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || "127.0.0.1";
app.listen(port, host, () => console.log(`API on ${host}:${port}`));
