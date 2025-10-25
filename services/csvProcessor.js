/**
 * File: services/csvProcessor.js
 * Description: Processes CSV files in batches, maps data to DB format, and inserts into PostgreSQL.
 *              Handles errors, transactions, and generates age distribution reports after processing.
 */

const fs = require('fs');
const readline = require('readline');
const pool = require('../config/db');
const logger = require('../config/logger');
const { parseCsvLine, buildObjectFromRow } = require('../utils/parser');
const { mapRowToDb } = require('../utils/mapper');
const { generateReport } = require('./reportService');

const BATCH_SIZE = 1000; // Number of records to insert per batch

/**
 * Inserts a batch of user records into the database.
 * @param {Array} batch - Array of user objects mapped to DB columns
 * @param {Object} client - PostgreSQL client
 */
async function insertBatch(batch, client) {
  try {
    const values = [];
    const placeholders = batch.map((row, index) => {
      const offset = index * 4; // 4 columns per row
      values.push(row.name, row.age, row.address, row.additional_info);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    }).join(',');

    const insertQuery = `
      INSERT INTO users (name, age, address, additional_info)
      VALUES ${placeholders}
    `;

    await client.query(insertQuery, values);
    logger.info(`Inserted batch of ${batch.length} records.`);
  } catch (error) {
    logger.error(`Failed to insert batch: ${error.stack}`);
    throw error; // Propagate error to rollback transaction
  }
}

/**
 * Processes a CSV file and inserts its data into the database.
 * @param {string} filePath - Path to the CSV file
 */
async function processCsv(filePath) {
  logger.info(`Starting CSV processing: ${filePath}`);

  const client = await pool.connect();
  let headers = [];
  let batch = [];
  let isFirstLine = true;
  let totalRecords = 0;

  try {
    const fileStream = fs.createReadStream(filePath);
    const csvLineReader = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    await client.query('BEGIN'); // Start transaction

    for await (const line of csvLineReader) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue; // Skip empty lines

      if (isFirstLine) {
        headers = parseCsvLine(trimmedLine);
        isFirstLine = false;
        continue;
      }

      const values = parseCsvLine(trimmedLine);
      if (values.length !== headers.length) {
        logger.warn(`Skipping malformed row (column mismatch): ${trimmedLine}`);
        continue;
      }

      try {
        const parsedObject = buildObjectFromRow(headers, values);
        const dbRow = mapRowToDb(parsedObject);
        batch.push(dbRow);
        totalRecords++;

        if (batch.length >= BATCH_SIZE) {
          await insertBatch(batch, client);
          batch = []; // Reset batch
        }
      } catch (rowError) {
        logger.error(`Error parsing row, skipping: ${trimmedLine}`, rowError);
      }
    }

    if (batch.length > 0) {
      await insertBatch(batch, client); // Insert remaining records
    }

    await client.query('COMMIT'); // Commit transaction
    logger.info(`CSV processing completed. Total records processed: ${totalRecords}`);
  } catch (fatalError) {
    await client.query('ROLLBACK'); // Rollback transaction on fatal error
    logger.error('Fatal error during CSV processing. Transaction rolled back.', fatalError.stack);
  } finally {
    client.release();
    logger.info('Database client released.');

    // Generate age distribution report
    try {
      logger.info('Generating age distribution report...');
      await generateReport();
    } catch (reportError) {
      logger.error('Failed to generate report:', reportError.stack);
    }
  }
}

module.exports = { processCsv };
