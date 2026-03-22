import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors(
    corsOrigins?.length
      ? { origin: corsOrigins, credentials: true }
      : { origin: true },
  ),
);
app.use(express.json());

/** Railway / load balancers often probe `/` — respond 200 so health checks pass. */
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "sysflow-backend",
    hint: "Use GET /api/health for a full health payload.",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "sysflow-backend",
    time: new Date().toISOString(),
  });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in backend environment variables.");
  }

  const dbName =
    process.env.MONGODB_DB_NAME?.trim() ||
    process.env.MONGODB_DB?.trim() ||
    "sysflow";
  await mongoose.connect(mongoUri, { dbName });

  // Bind to all interfaces so Docker / Railway can route traffic (not only 127.0.0.1).
  app.listen(port, "0.0.0.0", () => {
    console.log(`Backend API listening on 0.0.0.0:${port} (PORT from env)`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend API:", error);
  process.exit(1);
});
