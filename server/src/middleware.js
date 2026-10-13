const jwt = require("jsonwebtoken");
const db = require("./db");

function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    // Re-read the user so role changes and deletions take effect immediately
    const user = db
      .prepare("SELECT id, email, role FROM users WHERE id = ?")
      .get(id);
    if (!user) return res.status(401).json({ error: "Sign in required" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Sign in required" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Not allowed" });
  next();
}

// Blocks cross-site form posts. Every write must be JSON.
function requireJson(req, res, next) {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.body !== undefined &&
    !req.is("application/json")
  ) {
    return res.status(415).json({ error: "JSON only" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireJson };
