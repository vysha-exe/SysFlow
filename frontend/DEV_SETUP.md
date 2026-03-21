# Local dev — get the app usable

## 1. Environment (`frontend/.env.local`)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | **Required.** Use Atlas or local Mongo. **Never put `<` `>` around username/password** — that breaks auth. Use `...mongodb.net/sysflow?retryWrites=true&w=majority` |
| `NEXTAUTH_SECRET` | Any long random string locally |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `AUTH_ENABLED=false` | **Skips sign-in** and uses a built-in dev user (`dev-bypass@sysflow.local`). Remove or set `true` when you want real login. |

Restart `npm run dev` after any `.env.local` change.

## 2. MongoDB Atlas

- **Network Access:** allow your current IP (or `0.0.0.0/0` only for quick tests).
- **User/password** must match the URI.

## 3. Next.js 16 “proxy” (not `middleware.ts`)

This app uses **`src/proxy.ts`** only. Do **not** add `src/middleware.ts` — Next will error if both exist.

With `AUTH_ENABLED=false`, the proxy lets you through without a JWT. With auth on, you must sign in or you’ll be redirected to `/login`.

## 4. If pages still fail

- Open `/` — if you see a **database** error, fix `MONGODB_URI` / Atlas first.
- Open **Headmates** — if APIs return 401, bypass isn’t active (check env spelling) or DB didn’t create the dev user.
