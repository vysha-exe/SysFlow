SysFlow MVP is a web-first DID/OSDD system management app.

This starter includes:
- System profile dashboard
- Headmate profiles (create / edit / delete) + front controls
- Front session timer/history scaffold
- Journal feed scaffold
- MongoDB-backed account system (email/password + Google OAuth)

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- NextAuth.js (credentials + Google)

## Bundler (Webpack, not Turbopack)

`npm run dev` and `npm run build` use **Webpack** (`next dev --webpack` / `next build --webpack`). Next.js 16 defaults dev to Turbopack; on Windows, Turbopack can hit junction/symlink errors under `.next`. Webpack is the stable alternative here.

If PowerShell blocks `npm` scripts, use `npm.cmd` (e.g. `npm.cmd install`).

## Run Locally

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env.local`
   - Set:
     - **`MONGODB_URI`** — **must match** `backend/.env` (or your Atlas URI). Signup/login write to Mongo from **Next.js API routes** on the frontend, not from the Express server, so the URI is required **here** too.
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
3. Start dev server:
   - `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Routes
- `/` dashboard + active front timer
- `/headmates` headmate profiles (add, edit, delete) + who is fronting

## Headmate API (authenticated)
- `GET /api/headmates` — list
- `POST /api/headmates` — create (`name`, `pronouns`, `description` max 750 chars, `customFields` as ordered `{ key, value }[]`, max 60)
- `PATCH /api/headmates/[id]` — update (same fields, partial OK; legacy object-shaped `customFields` still accepted)
- `DELETE /api/headmates/[id]` — delete (updates front sessions + history)

## Headmate templates (per system)
- `GET /api/headmate-templates` — `{ templates: [{ id, name, fieldLabels }], defaultTemplateId }`
- `PUT /api/headmate-templates` — `{ templates, defaultTemplateId }` (max 20 templates; `fieldLabels` are title-only strings)
- `/front-history` front session timeline
- `/journal` journal entry feed
- `/login` sign in
- `/signup` create account

## Database

Mongo collection structure is documented in `mongodb/collections.md`.

Current account collections:
- `users`
- `systems`

## Next MVP Steps
- Replace mock data with Mongo-backed queries/mutations
- Add create/edit flows for headmates, sessions, and journal entries
- Add privacy filtering logic by visibility level

## Deploy
Deploy frontend on Vercel, use MongoDB Atlas, and configure OAuth callback URLs.
