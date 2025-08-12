#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
console.log('DATABASE_URL present:', Boolean(url));
if (!url) process.exit(1);

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  connectionTimeoutMillis: 15000,
});

async function main() {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected');
    const r1 = await client.query('select version()');
    console.log('version:', r1.rows[0]);
    const r2 = await client.query('select now() as now');
    console.log('now:', r2.rows[0]);
    const r3 = await client.query('select 1 as ok');
    console.log('ping:', r3.rows[0]);
  } catch (err) {
    console.error('ERROR:', err?.message || err);
    console.error(err?.stack);
  } finally {
    try { await client.end(); } catch {}
  }
}

main();


