const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000
});

pool.on('error', () => {
  console.error('PostgreSQL idle connection was lost; the pool will reconnect.');
});

module.exports = pool;
