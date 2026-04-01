import mongoose from 'mongoose';

const raw = process.env.MONGODB_URI;

if (!raw) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Decode percent-encoded characters (e.g. %40 → @) that Next.js dotenv doesn't decode
const MONGODB_URI = decodeURIComponent(raw);

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((m: typeof mongoose) => {
      console.log('[db] Connected');
      return m;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
