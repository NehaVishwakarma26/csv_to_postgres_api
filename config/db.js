// File: config/db.js
// Description: Creates and exports a PostgreSQL connection pool. 
// Validates environment variables and tests the connection at startup.

const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config();

/**
 * Validate required environment variables
 */
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_DATABASE', 'DB_PASSWORD', 'DB_PORT'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

/**
 * Create a PostgreSQL connection pool
 */
const dbPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

/**
 * Test the database connection
 * Logs success or exits process if connection fails
 */
async function testDatabaseConnection() {
  try {
    const result = await dbPool.query('SELECT NOW() AS current_time');
    logger.info(`Database connected successfully at ${result.rows[0].current_time}`);
  } catch (error) {
    logger.error(`Database connection failed: ${error.stack}`);
    process.exit(1); // Stop app if DB is unreachable
  }
}

// Test DB connection immediately on startup
testDatabaseConnection();

module.exports = dbPool;
