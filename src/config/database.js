const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'db.ssomoxfgsndncesyjllg.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'EmpireAuto1!',  // No encoding needed here
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
    return;
  }
  console.log('✓ Database connected successfully at', res.rows[0].now);
});

module.exports = pool;