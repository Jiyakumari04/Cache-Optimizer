import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { Privacy, Terms } from "./Legal.jsx";

async function api(path, body) {
  const r = await fetch("/api" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      onDone(await api("/auth/" + mode, { email, password }));
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <form onSubmit={submit} className="panel narrow">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {mode === "register" && (
        <p className="hint">
          At least 12 characters. By registering you accept the{" "}
          <Link to="/terms">Terms</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      )}
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <button type="submit">
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login"
          ? "Need an account? Register"
          : "Have an account? Sign in"}
      </button>
    </form>
  );
}

function Analyzer() {
  const [url, setUrl] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const load = () =>
    api("/analyze/history")
      .then(setHistory)
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  async function run(e) {
    e.preventDefault();
    setErr("");
    setRes(null);
    setBusy(true);
    try {
      setRes(await api("/analyze", { url }));
      load();
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }
  return (
    <>
      <form onSubmit={run} className="panel">
        <h1>Check a page's caching</h1>
        <p className="hint">
          Enter a public page or asset URL. Only headers are read.
        </p>
        <div className="row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/app.js"
            required
            aria-label="URL"
          />
          <button type="submit" disabled={busy}>
            {busy ? "Checking" : "Analyze"}
          </button>
        </div>
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
      </form>
      {res && (
        <section className="panel">
          <h2>Score {res.score} of 100</h2>
          <p className="hint">
            {res.url} responded {res.status}
          </p>
          <ul className="findings">
            {res.items.map((i, n) => (
              <li key={n} className={i.level}>
                {i.msg}
              </li>
            ))}
          </ul>
          <h3>Headers seen</h3>
          <pre>
            {Object.entries(res.headers)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n") || "None of the caching headers were sent."}
          </pre>
        </section>
      )}
      {history.length > 0 && (
        <section className="panel">
          <h2>Recent checks</h2>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Score</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.url}</td>
                  <td>{h.score}</td>
                  <td>{h.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

function Admin() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api("/admin/users")
      .then(setUsers)
      .catch(() => {});
    api("/admin/stats")
      .then(setStats)
      .catch(() => {});
  }, []);
  return (
    <section className="panel">
      <h1>Admin</h1>
      {stats && (
        <p>
          {stats.users} users, {stats.analyses} checks run.
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    api("/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);
  if (user === undefined) return null;
  const logout = async () => {
    await api("/auth/logout", {});
    setUser(null);
  };
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand">
          Cache Optimizer
        </Link>
        <nav>
          {user?.role === "admin" && <Link to="/admin">Admin</Link>}
          {user && (
            <button className="link" onClick={logout}>
              Sign out
            </button>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route
            path="/"
            element={user ? <Analyzer /> : <Auth onDone={setUser} />}
          />
          <Route
            path="/admin"
            element={user?.role === "admin" ? <Admin /> : <Navigate to="/" />}
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="foot">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms and Conditions</Link>
      </footer>
    </>
  );
}
