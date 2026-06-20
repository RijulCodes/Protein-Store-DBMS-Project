// config/db.js
// Creates a MySQL connection pool so multiple requests can run concurrently.

const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'protein_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

// Create reporter pool for SELECT-only analytics (Phase 2c)
let reporterPool;
if (process.env.REPORTER_DB_USER) {
  reporterPool = mysql.createPool({
    host:     process.env.DB_HOST             || 'localhost',
    user:     process.env.REPORTER_DB_USER,
    password: process.env.REPORTER_DB_PASSWORD,
    database: process.env.DB_NAME             || 'protein_store',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  }).promise();
} else {
  // Fallback to main pool if not configured, app-level safety checks still apply
  reporterPool = promisePool;
}

promisePool.reporterDb = reporterPool;

// Export promise-based interface
module.exports = promisePool;
