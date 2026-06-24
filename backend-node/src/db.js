import { MongoClient } from 'mongodb';
import { MONGO_URL, DB_NAME } from './config.js';

const client = new MongoClient(MONGO_URL);
let db;

export async function connectDb() {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
  }
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
}

export async function closeDb() {
  await client.close();
  db = null;
}
