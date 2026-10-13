const router = require("express").Router();
const db = require("./db");
const { requireAuth, requireAdmin } = require("./middleware");
router.use(requireAuth, requireAdmin);
router.get("/users", (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT id, email, role, created_at FROM users ORDER BY id DESC LIMIT 200",
      )
      .all(),
  ),
);
router.get("/stats", (req, res) =>
  res.json({
    users: db.prepare("SELECT COUNT(*) c FROM users").get().c,
    analyses: db.prepare("SELECT COUNT(*) c FROM analyses").get().c,
  }),
);
module.exports = router;
