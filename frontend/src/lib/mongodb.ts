import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/** App database name (Mongo default without a path in the URI is `test`). */
export const SYSFLOW_DATABASE_NAME = "sysflow";

const resolvedDbName =
  process.env.MONGODB_DB_NAME?.trim() ||
  process.env.MONGODB_DB?.trim() ||
  SYSFLOW_DATABASE_NAME;

/** Fail fast instead of hanging the browser for minutes when Mongo is down or unreachable. */
const MONGO_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
  dbName: resolvedDbName,
};

declare global {
  var mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global.mongooseConnection ?? { conn: null, promise: null };

if (!global.mongooseConnection) {
  global.mongooseConnection = cached;
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  if (MONGODB_URI.includes("<") || MONGODB_URI.includes(">")) {
    throw new Error(
      "MONGODB_URI must not contain < or > around the username or password. Use: mongodb+srv://myuser:mypassword@cluster.../dbname?... (no angle brackets).",
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, MONGO_OPTIONS).catch((err) => {
      cached.promise = null;
      cached.conn = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
