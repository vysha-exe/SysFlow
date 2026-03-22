# Deployment environment variables

Use these in **Vercel** (frontend) and **Railway** (backend) dashboards. Do not commit real values to git.

## Vercel — `frontend` (Next.js)

```bash
# Required
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/?retryWrites=true&w=majority
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://YOUR-PROJECT.vercel.app

# Optional — default DB name in code is sysflow; set only to override
# MONGODB_DB_NAME=sysflow

# Google OAuth (if you use Google sign-in)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Production safety
# AUTH_ENABLED=true
# DEV_BYPASS_AUTH=false
```

## Railway — `backend` (Express)

```bash
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/?retryWrites=true&w=majority

# Optional — Railway sets PORT; only set if you need a fixed value locally
# PORT=4000

# Optional — browser origins allowed by CORS (comma-separated)
# CORS_ORIGIN=https://YOUR-PROJECT.vercel.app
```

## MongoDB database name

The Next.js app connects with **`dbName: sysflow`** by default (see `frontend/src/lib/mongodb.ts`).  
The Express backend uses the same default (see `backend/src/index.ts`).  
Override with **`MONGODB_DB_NAME`** only if you use a different database name.
