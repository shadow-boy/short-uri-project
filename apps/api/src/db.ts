import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Load .env from current working directory only if exists; otherwise rely on process env (e.g., Vercel)
const maybeEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(maybeEnvPath)) {
  dotenv.config({ path: maybeEnvPath });
} else {
  // dotenv.config();
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);


