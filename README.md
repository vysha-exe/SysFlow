# SysFlow

**SysFlow** is a web app for **plural systems**—people who experience more than one sense of self or identity within one body- often in the context of **[dissociative identity disorder (DID)](https://www.isst-d.org/)** or **other specified dissociative disorder (OSDD)**.

It helps systems **track who is “fronting”** (present and in control), **manage headmate profiles**, and **keep a journal**—with room to grow.

---

## What is dissociative identity disorder (DID)?

**DID** is a **trauma-related dissociative disorder**. In DID, a person’s mind may have separated aspects of experience and identity in ways that can feel like **distinct parts** or **identity states** (sometimes called **alters** or **headmates** in community language). These parts are **not** “fake personalities”—they are **real, meaningful aspects of one person’s lived experience**, often shaped by how the mind adapted to overwhelming events.

**OSDD** is another dissociative diagnosis on a similar spectrum; experiences vary widely person to person.

> **Note:** SysFlow is a **tool**, not medical care. It does not diagnose or treat anything. If you’re struggling, consider reaching out to a **trauma-informed** mental health professional.

---

## Why an app like this?

Many plural systems juggle:

- **Memory gaps or confusion** about who was present when  
- **Co-consciousness** (more than one part aware at once) or **switching**  
- A need to **communicate** inside the system or with trusted people  
- **Safety and privacy** around sensitive history  

A dedicated app can:

- Record **who is fronting** and **for how long** (when the system chooses to log it)  
- Hold **headmate profiles** (names, notes, privacy levels) in one place  
- Support **journaling** and **history** so patterns are easier to see—**on the user’s terms**  

SysFlow is built to respect that **the user decides** what to track and how to name their experience.

---

## What SysFlow does (today)

| Area | Description |
|------|-------------|
| **Accounts** | Sign up / sign in with **email & password**. Data is tied to a **system** workspace in MongoDB. |
| **Dashboard** | **System profile** (name, username, description), **current front** with **per–headmate timers** (including co-fronting), notes on the active session, and links to other areas. |
| **Headmates** | **Create, edit, delete** headmate profiles (Mongo-backed). Set **who is fronting** from here; manage **custom field templates** per system (API + UI integration). |
| **Front tracking** | **Add / set / remove** who is fronting; co-fronters can run on separate timers; changes end or split **intervals** so you get an accurate **history**. |
| **Front history** | **Timeline** of front sessions and intervals, **editing** where supported, and **analytics** views driven by the front APIs. |
| **Journal** | **Full CRUD** journal entries in MongoDB—title, body, optional headmate tags, **search/filter** in the UI. **Optional:** anchor a **SHA-256 fingerprint** of an entry on **Solana** (memo transaction); full text stays in the database. See `docs/journal-solana-anchor.md`. |
| **Theme** | **Light / dark** mode and a **teal**-accented palette with semantic colors (e.g. warnings, success). |

The **Express backend** in this repo is a **small health/Mongo scaffold**; **auth, headmates, front, journal, and Solana anchoring** run inside the **Next.js** app (API routes + MongoDB).

---

## Repository layout

```text
SysFlow/
├── README.md                 ← You are here (workspace overview)
├── DEPLOY.md                 ← Vercel / Railway deployment
├── docs/
│   ├── deployment-env-vars.md
│   └── journal-solana-anchor.md   ← optional Solana hash anchoring
├── frontend/                 ← Main web app (Next.js)
│   ├── README.md             ← Frontend: env, routes, bundler notes
│   ├── mongodb/
│   │   └── collections.md    ← Mongo collection notes
│   ├── src/
│   │   ├── app/              ← App Router: pages + API routes
│   │   │   ├── page.tsx      ← Dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── signout/
│   │   │   ├── headmates/
│   │   │   ├── front-history/
│   │   │   ├── journal/
│   │   │   └── api/          ← NextAuth, signup, headmates, front, journal, journal/anchor, …
│   │   ├── components/       ← UI (app shell, dashboard, headmates, journal, theme, …)
│   │   ├── lib/              ← Auth, Mongo, front actions, journal/Solana helpers, …
│   │   ├── models/           ← Mongoose models (user, system, headmate, front, journal, …)
│   │   └── types/            ← TypeScript types / NextAuth extensions
│   ├── .env.example
│   └── package.json
├── backend/                  ← Express + Mongo health scaffold
│   ├── src/
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
└── .gitignore
```

### Frontend (`frontend/`)

| Path | Role |
|------|------|
| `src/app/` | Routes and **server/API route handlers** (`api/auth`, `api/headmates`, `api/front`, `api/journal`, `api/journal/[id]/anchor`, …). |
| `src/components/` | Client and shared UI: layout shell, dashboard, headmates, journal, theme, forms. |
| `src/lib/` | **Mongo connection**, **NextAuth options**, **front session actions**, **journal + Solana memo** helpers. |
| `src/models/` | **Mongoose** schemas for users, systems, headmates, front sessions, journal entries, etc. |

### Backend (`backend/`)

| Path | Role |
|------|------|
| `src/index.ts` | Express server (e.g. **health check**); optional separate service from the Next app. |

---

## Quick start

### Prerequisites

- **Node.js** (LTS recommended)  
- **MongoDB** (e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))  

### Frontend (primary app)

1. `cd frontend`  
2. `npm install`  
3. Copy `.env.example` → `.env.local` and set at least:
   - **`MONGODB_URI`** — required for signup/login and plural data (Next.js talks to Mongo directly).  
   - **`NEXTAUTH_SECRET`**, **`NEXTAUTH_URL`**  
   - Optional: **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`** for Google sign-in  
   - Optional (journal hash anchoring): **`SOLANA_ANCHOR_SECRET_KEY`** (base64-encoded 64-byte keypair), **`SOLANA_CLUSTER`** (e.g. `devnet`), **`SOLANA_RPC_URL`** — see `docs/journal-solana-anchor.md`  
4. `npm run dev` — uses **Webpack** (see `frontend/README.md` for why).  
5. Open [http://localhost:3000](http://localhost:3000)

### Backend (optional scaffold)

1. `cd backend`  
2. `npm install`  
3. Copy `.env.example` → `.env` (Mongo URI if you use the health route)  
4. `npm run dev`  

Health check (default): `http://localhost:4000/api/health`

---

## Documentation & links

- **Mongo collections:** `frontend/mongodb/collections.md`  
- **Journal hash anchoring (Solana):** `docs/journal-solana-anchor.md`  
- **Bundler / PowerShell / env details:** `frontend/README.md`  
- **Dissociation & DID (professional):** [ISST-D](https://www.isst-d.org/) — International Society for the Study of Trauma & Dissociation  

## Deploy

- **[DEPLOY.md](./DEPLOY.md)** — step-by-step **Vercel** (Next.js: Root Directory **`frontend`**, `frontend/vercel.json`) and **Railway**, troubleshooting.  
- **[docs/deployment-env-vars.md](./docs/deployment-env-vars.md)** — environment variable list for copy/paste into each platform (including optional Solana anchoring on Vercel).
