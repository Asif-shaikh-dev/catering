require('dotenv').config();
const { Pool } = require('pg');

// No hard-coded password fallback: credentials must come from .env
if (!process.env.DB_PASSWORD) {
  console.error('⚠ DB_PASSWORD is not set. Create a .env file (see .env.example).');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'asif6701',
  database: process.env.DB_NAME || 'catering_db',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

module.exports = pool;
