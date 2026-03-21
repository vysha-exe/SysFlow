# Deploy SysFlow (Vercel + Railway)

Monorepo layout:

- **`frontend/`** → Vercel (Next.js)
- **`backend/`** → Railway (Express API)

Do **not** commit real secrets. Set variables in each platform’s dashboard.

---

## 1. Frontend — Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. **Root Directory:** either leave as **`.` (repository root)** — this repo includes a root **`vercel.json`** that installs and builds from **`frontend/`** — **or** set Root Directory to **`frontend`** and use default build (you can remove overrides; `frontend/vercel.json` still applies for regions).
4. Framework preset: **Next.js**. If Vercel does not auto-detect, pick **Next.js** manually.

### “404 NOT_FOUND” on `*.vercel.app`

Usually the deployment **did not build the Next app** (wrong folder).

1. **If Root Directory is empty or `.`:** ensure the latest **`vercel.json`** at the repo root is deployed (it runs `cd frontend && npm ci` and `cd frontend && npm run build`).
2. **If you set Root Directory to `frontend`:** clear **Build Command** / **Install Command** overrides in Vercel (use defaults) so they are not still pointing at the repo root.
3. Confirm the **Production deployment** succeeded (green check). A failed build can still show a generic 404.
4. Set **`NEXTAUTH_URL`** to your exact Vercel URL, e.g. `https://your-project.vercel.app` (no trailing slash).
5. **Environment variables** (Production + Preview as needed):

   | Name | Notes |
   |------|--------|
   | `MONGODB_URI` | Same Atlas URI as local; include DB name, no `<` `>` in user/pass |
   | `NEXTAUTH_SECRET` | Long random string (`openssl rand -base64 32`) |
   | `NEXTAUTH_URL` | **Production:** `https://your-app.vercel.app` (your real domain) |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | If you use Google sign-in |
   | `AUTH_ENABLED` | Omit or `true` in production (do **not** set `false` on public deploys unless you understand the risk) |

6. After deploy, update **Google OAuth** (if used) authorized redirect URIs to  
   `https://your-domain/api/auth/callback/google`.

7. **Atlas:** Network Access → allow Vercel (often `0.0.0.0/0` for serverless, or Atlas “access from anywhere” patterns).

---

## 2. Backend — Railway

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub** (same repo).
2. Add a **service** from the repo → **Settings → Root Directory** = `backend`.
3. **Build / deploy:** default **Nixpacks** reads `backend/railway.toml` (`npm install && npm run build`, then `npm start`).
   - **Alternative:** Settings → switch builder to **Dockerfile** to use `backend/Dockerfile`.
4. **Variables:**

   | Name | Notes |
   |------|--------|
   | `MONGODB_URI` | Atlas connection string |
   | `PORT` | Optional; Railway injects `PORT` automatically |
   | `CORS_ORIGIN` | Optional; comma-separated allowed origins (e.g. `https://your-app.vercel.app`) |

5. **Public URL:** generate a domain for the service; health check: `GET /api/health`.

The Next.js app currently talks to **MongoDB directly** and its own `/api/*` routes. Point the frontend at this Railway URL only when you start calling the Express API from the browser.

---

## 3. Git

- `.env`, `.env.local`, and similar are already in `.gitignore`.
- `.vercel` is ignored so local Vercel CLI state is not committed.

---

## 4. Checklist before going live

- [ ] Rotate any credentials that ever appeared in chat or old commits.
- [ ] `NEXTAUTH_URL` matches the deployed URL exactly.
- [ ] `AUTH_ENABLED` not set to `false` on production unless intentional.
- [ ] Atlas IP / access rules allow Vercel + Railway.
