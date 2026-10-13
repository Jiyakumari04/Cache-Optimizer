# Cache Optimizer

A web app that checks the HTTP caching headers of a public URL and returns a graded report with specific fixes. Sign in, enter a page or asset URL, and see what is missing or misconfigured: `Cache-Control`, `ETag`, `Last-Modified`, `Vary`, and compression.

## Features

- Scores a URL out of 100 and lists each problem with a plain explanation
- Reads headers only; it never stores the page body
- Per-user history of previous checks
- Account system with an admin area
- Privacy Policy and Terms and Conditions pages

## Tech stack

- Frontend: React 18, Vite, React Router
- Backend: Node.js, Express
- Database: SQLite through `better-sqlite3`

## Security

- Passwords hashed with bcrypt (cost 12)
- Sessions in httpOnly, Secure, SameSite=Strict cookies with an 8 hour expiry
- Server-side role checks on every admin route
- Rate limits on login, registration, analysis and general API traffic
- Input validation with zod; parameterized SQL only
- Strict Content-Security-Policy, HSTS and other headers through helmet
- CORS limited to a single configured origin
- SSRF protection on the analyzer: private, loopback and link-local addresses, unusual ports and URL credentials are rejected, and redirects are not followed
- The server refuses to start if required secrets are missing or too short
- No secrets in the repository; `.env` and database files are git-ignored

No software can be guaranteed unhackable. Keep dependencies updated and review `GUIDE.md` before going live.

## Project structure

```
cache-optimizer/
  server/    Express API, auth, analyzer, database
  client/    React app (Vite)
  GUIDE.md   Full setup, security audit and deployment guide
```

## Quick start

Requirements: Node.js 22 or 24 LTS and Git.

```bash
git clone https://github.com/YOUR-USERNAME/cache-optimizer.git
cd cache-optimizer

# Backend
cd server
npm install
cp .env.example .env        # Windows Command Prompt: copy .env.example .env
```

Generate a secret and paste it into `server/.env` as `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For local work set `NODE_ENV=development`, `CLIENT_ORIGIN=http://localhost:5173` and `ADMIN_EMAIL` to your own email. Then start the API:

```bash
npm run dev
```

In a second terminal, start the frontend:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 and register using the `ADMIN_EMAIL` address to get the admin account.

## Environment variables

| Name | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Random string of at least 32 characters used to sign sessions |
| `CLIENT_ORIGIN` | Yes | Exact public address of the site, with no trailing slash |
| `ADMIN_EMAIL` | No | The account registered with this email becomes admin |
| `NODE_ENV` | No | Set to `production` when deployed |
| `PORT` | No | API port, default 4000 |
| `HOST` | No | Bind address, default 127.0.0.1. Use 0.0.0.0 on hosts like Render |
| `DB_FILE` | No | SQLite file path, default `./data/app.db` |

Never commit `.env`.

## Production build

```bash
cd client && npm ci && npm run build
cd ../server && npm ci --omit=dev
NODE_ENV=production node src/index.js
```

In production the server also serves the built frontend from `client/dist`.

## Deployment

`GUIDE.md` covers both options step by step:

- Free hosting on Render with no domain (note that free plans use a temporary disk, so the SQLite data is lost on restart)
- A Linux VPS with Nginx, HTTPS through Certbot, PM2, firewall and backups

## Known limitations

- No email verification or password reset yet
- No automated tests yet
- SQLite is single-server; use a hosted database for data that must survive redeploys on free hosting
- DNS rebinding can still defeat the SSRF check in rare cases; block private outbound ranges at the firewall for high-risk deployments

## Reporting a vulnerability

Please do not open a public issue for security problems. Email security@yourdomain.com with details and steps to reproduce.

## License

Add a license before publishing. If you want others to reuse the code, MIT is a common choice; add a `LICENSE` file to the repository root.
