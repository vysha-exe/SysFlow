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

  app.listen(port, () => {
    console.log(`Backend API running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend API:", error);
  process.exit(1);
});
