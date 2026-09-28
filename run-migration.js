const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, 'supabase', 'migrations', '20260504_create_user_push_tokens.sql'),
  'utf-8',
);

const client = new Client({
  host: 'db.wdqwgqfisiteswbbdurg.supabase.co',
  port: 5432,
  user: 'cli_login_postgres',
  password: 'ePYcBZZZXFDlMfVbEvDimAmmXgHzuMrn',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to remote DB');
    await client.query(sql);
    console.log('Migration executed successfully');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
