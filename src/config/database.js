const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('⚠️  No DATABASE_URL found in environment variables');
}

const pool = new Pool({
  connectionString:  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err. message);
    return;
  }
  console. log('✓ Database connected successfully at', res.rows[0].now);
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = pool;