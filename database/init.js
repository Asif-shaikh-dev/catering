// Applies database/schema.sql.   Usage:  npm run db:init
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../backend/config/db');

(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('✓ Database schema is ready.');
  } catch (err) {
    console.error('Schema failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
