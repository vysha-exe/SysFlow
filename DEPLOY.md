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

### Step 3 — Root directory (required — fixes `npm ci` exit 1)

Set **Root Directory** to **`frontend`** (the folder that contains `package.json` and `next.config.ts`).

- **Project → Settings → General → Root Directory** → `frontend` → Save.

**Why:** If Root Directory is left as the repo root while install runs `cd frontend && npm ci`, that works **only** when the working directory is the monorepo root. If you instead set Root Directory to `frontend` (or Vercel resolves paths differently), `cd frontend` can point at a **missing** `frontend/frontend` folder and **`npm ci` exits with 1**. Putting the app root at **`frontend/`** matches **`frontend/vercel.json`** and runs `npm ci` in the right place.

### Step 4 — Framework

- **Framework Preset:** **Next.js** (auto-detected from `frontend/`).

### Step 5 — Build commands (from `frontend/vercel.json`)

After Root Directory is **`frontend`**, these should match (clear any old overrides in the dashboard):

| Setting | Value |
|---------|--------|
| **Install Command** | `npm ci` |
| **Build Command** | `npm run build` |

Do **not** set a custom Output Directory for standard Next on Vercel.

**If `npm ci` still fails:** open the deployment **Build Logs** — often the lockfile is missing from git (`frontend/package-lock.json` must be committed) or out of sync with `package.json`. Run `npm install` locally in `frontend/`, commit the updated lockfile, and push. As a last resort, set Install Command to `npm install` (less strict than `npm ci`).

**If the build fails with** `ENOENT ... routes-manifest-deterministic.json` **(or similar under `.next/`):** `next.config.ts` skips `outputFileTracingRoot` when **`VERCEL=1`** (set automatically on Vercel). That option was for local `next-themes` resolution but can confuse serverless file tracing. Redeploy after pulling the latest `frontend/next.config.ts`.

### Step 6 — Environment variables

Add in **Settings → Environment Variables** (at least **Production**; add **Preview** if you use preview URLs):

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | Atlas SRV string |
| `NEXTAUTH_SECRET` | Yes | e.g. `openssl rand -base64 32` — **required** for sign-in to work in production |
| `NEXTAUTH_URL` | Yes | **Exact** public URL: `https://YOUR-PROJECT.vercel.app` (no trailing slash). Wrong/missing values often look like “nothing happens” after Sign in — cookies/JWT won’t be issued. |
| `GOOGLE_CLIENT_ID` | If Google login | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | If Google login | |
| `AUTH_ENABLED` | Optional | Omit or `true` in production |
| `DEV_BYPASS_AUTH` | Optional | Set `false` or omit in production |
| `MONGODB_DB_NAME` | Optional | Only if not using default `sysflow` |

Redeploy after changing env vars (**Deployments → … → Redeploy**).

#### “Cannot reach the database” after deploy (signup / API)

Serverless (Vercel) **does not read** your laptop’s `.env.local`. **`MONGODB_URI` must be set in the Vercel dashboard** for the environment you use (**Production** for your live URL; add **Preview** too if you test preview deployments).

1. **Vercel** → your project → **Settings** → **Environment Variables**  
   - Name: **`MONGODB_URI`** (exact spelling)  
   - Value: full Atlas connection string (same as local, without `<` `>` around user/password)  
   - Enable **Production** (and Preview if needed) → **Save**  
   - **Redeploy** (env vars are not applied to old deployments until you redeploy).

2. **Atlas** → **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) for serverless. (Vercel has no single fixed outbound IP per project; restricting to “your IP only” breaks production.)

3. **Atlas** → **Database** → user exists and password matches what’s in the URI. If the password has `@`, `#`, etc., **URL-encode** it in the URI.

4. **Smoke test:** open `https://YOUR-PROJECT.vercel.app/api/health/mongo` — you should see `"ok": true` and a `readyState` of `1`. If `ok` is false, read the `error` field (often missing env or network).

### Step 7 — Google OAuth (if used)

In Google Cloud Console → **Credentials** → your OAuth client:

- **Authorized JavaScript origins:** `https://YOUR-PROJECT.vercel.app`
- **Authorized redirect URIs:** `https://YOUR-PROJECT.vercel.app/api/auth/callback/google`

### Step 8 — Fix “404 NOT_FOUND” on `*.vercel.app`

1. Confirm **Root Directory** is **`frontend`** and the production build succeeded (green check).
2. Set **`NEXTAUTH_URL`** to the **same** hostname users open in the browser.

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

- **`frontend/vercel.json`** — Vercel install/build when Root Directory is **`frontend`**
- **`backend/railway.toml`** — Railway Nixpacks build/start
- **`backend/Dockerfile`** — optional Docker deploy on Railway
