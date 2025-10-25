/**
 * File: services/reportService.js
 * Description: Generates age distribution reports from the users table.
 *              Calculates percentage distribution and logs results using structured logging.
 */

const pool = require('../config/db');
const logger = require('../config/logger');
const { GET_TOTAL_USERS_WITH_AGE, GET_AGE_DISTRIBUTION } = require('../queries/userQueries');

/**
 * Generates an age distribution report for users
 */
async function generateReport() {
  const client = await pool.connect();

  try {
    const totalResult = await client.query(GET_TOTAL_USERS_WITH_AGE);
    const totalUsers = parseInt(totalResult.rows[0].total, 10);

    if (totalUsers === 0) {
      logger.info('No users with age data found.');
      return;
    }

    const distributionResult = await client.query(GET_AGE_DISTRIBUTION);

    // Initialize all age groups to 0%
    const ageGroups = { '< 20': 0, '20 to 40': 0, '40 to 60': 0, '> 60': 0 };

    distributionResult.rows.forEach((row) => {
      ageGroups[row.age_group] = ((row.count / totalUsers) * 100).toFixed(2);
    });

    // Log report header
    logger.info('--- Age Distribution Report ---');
    logger.info('Age Group    | % Distribution');
    Object.entries(ageGroups).forEach(([group, percentage]) => {
      logger.info(`${group.padEnd(12)} | ${percentage}%`);
    });
    logger.info('---------------------------------');

  } catch (error) {
    logger.error('Error generating age distribution report:', error.stack);
  } finally {
    client.release();
  }
}

module.exports = { generateReport };
