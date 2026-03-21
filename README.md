# SysFlow Workspace

This repository is split into:

- `frontend`: Next.js web app (UI + current auth flow)
- `backend`: standalone Express + MongoDB API scaffold

## Quick Start

### Frontend
1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env.local`
4. `npm run dev`

### Backend
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

Backend health check: `http://localhost:4000/api/health`
