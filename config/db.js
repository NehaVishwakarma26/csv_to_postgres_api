/**
 * File: config/db.js
 * Description:
 *   Sets up and manages the PostgreSQL connection.
 *   Ensures the database and required tables exist,
 *   verifies the connection, and exports the pool for use.
 */

const { Pool, Client } = require('pg');
require('dotenv').config();
const logger = require('./logger');
const { CREATE_USERS_TABLE } = require('../queries/userQueries'); // Table queries
const { CHECK_DATABASE_EXISTS, CREATE_DATABASE, TEST_CONNECTION } = require('../queries/dbQueries'); // All DB queries

// Required environment variables for database connection
const REQUIRED_ENV_VARS = ['DB_USER', 'DB_HOST', 'DB_DATABASE', 'DB_PASSWORD', 'DB_PORT'];

// Validate environment variables
REQUIRED_ENV_VARS.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

/**
 * Ensures the target database exists. If not, it creates the database.
 */
async function ensureDatabaseExists() {
  const defaultDbClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
  });

  try {
    await defaultDbClient.connect();

    const targetDatabaseName = process.env.DB_DATABASE;
    const dbExistsResult = await defaultDbClient.query(CHECK_DATABASE_EXISTS, [targetDatabaseName]);

    if (dbExistsResult.rowCount === 0) {
      logger.info(`Database "${targetDatabaseName}" does not exist. Creating...`);
      await defaultDbClient.query(CREATE_DATABASE(targetDatabaseName));
      logger.info(`Database "${targetDatabaseName}" created successfully.`);
    } else {
      logger.info(`Database "${targetDatabaseName}" already exists.`);
    }
  } catch (error) {
    logger.error('Error checking/creating database:', error.stack);
    process.exit(1);
  } finally {
    await defaultDbClient.end();
  }
}

/**
 * Creates a PostgreSQL connection pool to the target database
 */
const dbPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

/**
 * Tests the database connection by executing a simple query
 */
async function testDatabaseConnection() {
  try {
    const result = await dbPool.query(TEST_CONNECTION); // moved query to separate file
    logger.info(`Database connected successfully at ${result.rows[0].current_time}`);
  } catch (error) {
    logger.error('Database connection failed:', error.stack);
    process.exit(1);
  }
}

/**
 * Ensures that the 'users' table exists in the database. Creates it if it does not exist.
 */
async function ensureUsersTableExists() {
  const client = await dbPool.connect();
  try {
    await client.query(CREATE_USERS_TABLE);
    logger.info('Users table ensured.');
  } catch (error) {
    logger.error('Error creating users table:', error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

/**
 * Initializes the database:
 *   - Ensures database exists
 *   - Tests connection
 *   - Ensures required tables exist
 */
(async function initializeDatabase() {
  await ensureDatabaseExists();
  await testDatabaseConnection();
  await ensureUsersTableExists();
})();

// Export the database pool for use in other modules
module.exports = dbPool;