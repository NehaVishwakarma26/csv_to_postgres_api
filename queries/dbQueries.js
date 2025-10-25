/**
 * File: queries/dbQueries.js
 * Description:
 *   Stores PostgreSQL queries related to database existence, creation, and testing connection.
 */

const CHECK_DATABASE_EXISTS = `
  SELECT 1 
  FROM pg_database 
  WHERE datname = $1
`;

const CREATE_DATABASE = (dbName) => `CREATE DATABASE "${dbName}"`;

// Query to test the database connection
const TEST_CONNECTION = `SELECT NOW() AS current_time`;

module.exports = {
  CHECK_DATABASE_EXISTS,
  CREATE_DATABASE,
  TEST_CONNECTION,
};
