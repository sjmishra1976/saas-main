import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/saas_main";

let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      autoIndex: true
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
