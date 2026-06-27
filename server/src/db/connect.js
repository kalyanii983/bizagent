import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.warn('MONGODB_URI is not configured; running with in-memory fallback data.');
    return null;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    return mongoose.connection;
  } catch (error) {
    console.warn('MongoDB connection failed; running with in-memory fallback data.', error?.message || error);
    return null;
  }
}
