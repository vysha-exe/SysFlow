# Optional: Railway → Settings → set builder to **Dockerfile** instead of Nixpacks.
# Service root must be `backend/`.

FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]
