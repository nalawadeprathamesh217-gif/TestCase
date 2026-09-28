require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  // Use connection string from env if available, or try Supabase connection logic
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL in .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '../phase14_quality.sql'), 'utf8');
    await client.query(sql);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
