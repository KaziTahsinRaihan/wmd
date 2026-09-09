// MongoDB connection helper — SERVER ONLY. Never import this from a client
// component; it reads the connection string from the environment and holds a
// pooled MongoClient. In development the client is cached on globalThis so
// Next.js hot-reloads don't open a new pool on every change. The client is
// created lazily (on first getDb call) so a build without env vars doesn't
// crash at import time.

import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
  }
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
      }).connect();
    }
    return global._mongoClientPromise;
  }
  return new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || "ielts_prep");
}
