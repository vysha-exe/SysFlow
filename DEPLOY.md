# Deploy SysFlow (Vercel + Railway)

Monorepo layout:

| Path | Platform | What it is |
|------|----------|------------|
| **`frontend/`** | **Vercel** | Next.js app (pages, API routes, NextAuth, MongoDB via Mongoose) |
| **`backend/`** | **Railway** (optional) | Express API (`/api/health` scaffold) |

The **main product** runs on **Vercel**. Deploy **Railway** only if you want the separate Express service.

---

## Security (read this)

- **Do not commit** real secrets (`MONGODB_URI`, `NEXTAUTH_SECRET`, Google OAuth secrets, or any `.env` / `.env.local` with real values).
- Set secrets **only** in each host’s dashboard (Vercel → Settings → Environment Variables, Railway → Variables).
- This repo does **not** rely on ignore files for your safety—you choose what you `git add` and push.

---

## MongoDB / database name

- The app uses database **`sysflow`** by default (Mongoose `dbName` in code). Create that database in Atlas (or rely on first-write to create collections).
- **`MONGODB_URI`**: `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/...?retryWrites=true&w=majority` — **no** `<` or `>` around user/password.
- Optional override: **`MONGODB_DB_NAME`** if you need a different DB name.

**Atlas:** Network Access → allow your deploy regions (many setups use `0.0.0.0/0` for serverless; tighten if you can).

---

## 1. Vercel — Next.js (`frontend/`)

### Step 1 — Push code

Push this repository to GitHub (or GitLab / Bitbucket).

### Step 2 — New project

1. Go to [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. **Import** your `SysFlow` repository.

### Step 3 — Root directory

- Set **Root Directory** to the **repository root** (`.` / leave default **empty** / **not** `frontend`).
- Vercel will read **`vercel.json`** at the repo root, which runs install/build inside `frontend/`.

### Step 4 — Framework

- **Framework Preset:** **Next.js** (auto-detected in most cases).

### Step 5 — Build commands (from root `vercel.json`)

These should appear automatically; if you overrode them, reset to match:

| Setting | Value |
|---------|--------|
| **Install Command** | `cd frontend && npm ci` |
| **Build Command** | `cd frontend && npm run build` |

Do **not** set a custom Output Directory for standard Next on Vercel.

### Step 6 — Environment variables

Add in **Settings → Environment Variables** (at least **Production**; add **Preview** if you use preview URLs):

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | Atlas SRV string |
| `NEXTAUTH_SECRET` | Yes | e.g. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | **Exact** public URL: `https://YOUR-PROJECT.vercel.app` (no trailing slash) |
| `GOOGLE_CLIENT_ID` | If Google login | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | If Google login | |
| `AUTH_ENABLED` | Optional | Omit or `true` in production |
| `DEV_BYPASS_AUTH` | Optional | Set `false` or omit in production |
| `MONGODB_DB_NAME` | Optional | Only if not using default `sysflow` |

Redeploy after changing env vars (**Deployments → … → Redeploy**).

### Step 7 — Google OAuth (if used)

In Google Cloud Console → **Credentials** → your OAuth client:

- **Authorized JavaScript origins:** `https://YOUR-PROJECT.vercel.app`
- **Authorized redirect URIs:** `https://YOUR-PROJECT.vercel.app/api/auth/callback/google`

### Step 8 — Fix “404 NOT_FOUND” on `*.vercel.app`

1. Confirm **Root Directory** is repo root (so `vercel.json` runs `frontend` build).
2. Open the latest deployment → **Build Logs** — build must succeed (green).
3. Set **`NEXTAUTH_URL`** to the **same** hostname users open in the browser.

---

## 2. Railway — Express (`backend/`)

### Step 1 — New project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select the **same** `SysFlow` repository.

### Step 2 — Service root directory

1. Open the **service** → **Settings**.
2. **Root Directory** → set to **`backend`** (critical for a monorepo).

### Step 3 — Build & start

Railway picks up **`backend/railway.toml`**:

- **Build:** `npm install && npm run build`
- **Start:** `npm start` (runs `node dist/index.js`)

**Alternative:** **Settings → Build → Builder** → **Dockerfile** → ensure the Dockerfile path is **`backend/Dockerfile`** (service root is still `backend`).

### Step 4 — Variables

| Variable | Notes |
|----------|--------|
| `MONGODB_URI` | Same Atlas URI as Vercel if this service uses Mongo |
| `PORT` | Usually **auto-set** by Railway; optional to set manually |
| `CORS_ORIGIN` | Optional; comma-separated browser origins, e.g. `https://YOUR-PROJECT.vercel.app` |

### Step 5 — Public URL

**Settings → Networking → Generate Domain**. Check:

`GET https://YOUR-RAILWAY-URL.up.railway.app/api/health` → `{ "ok": true, ... }`

### Note — Frontend vs Railway

Today, the **Next.js** app talks to **MongoDB** and its own **`/api/*`** routes. The Railway app is a **separate** API; wire the browser to it only if you add client calls to that base URL.

---

## 3. Go-live checklist

- [ ] No secrets committed in git history for this deploy.
- [ ] `NEXTAUTH_URL` matches the live site URL exactly.
- [ ] `DEV_BYPASS_AUTH` / `AUTH_ENABLED` are safe for production.
- [ ] Atlas allows connections from Vercel (and Railway if used).
- [ ] Google OAuth redirect URIs updated if using Google sign-in.

---

## 4. Quick reference

See also: **`docs/deployment-env-vars.md`** (copy-paste friendly list).

Config files (no ignore files added by this doc):

- **`vercel.json`** (repo root) — Vercel install/build for `frontend/`
- **`backend/railway.toml`** — Railway Nixpacks build/start
- **`backend/Dockerfile`** — optional Docker deploy on Railway
