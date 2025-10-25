/**
 * File: services/csvProcessor.js
 * Description:
 *   Safely processes CSV files in batches and prepares data for DB insertion.
 *   Mandatory fields are validated; optional fields are converted to JSON or null.
 *   SQL queries are imported from a separate file for clean separation of concerns.
 */

const fs = require('fs');
const readline = require('readline');
const pool = require('../config/db');
const logger = require('../config/logger');
const { buildObjectFromRow } = require('../utils/parser');
const { generateReport } = require('./reportService');
const { INSERT_USERS_BATCH } = require('../queries/userQueries');

const BATCH_SIZE = 1000;

/**
 * Maps a parsed CSV object to a database row.
 * Validates mandatory fields and converts optional fields to JSON or null.
 * @param {Object} parsedRecord
 * @returns {Object|null} DB row or null if mandatory fields are invalid
 */
function mapCsvRecordToDbRow(parsedRecord) {
  try {
    const firstName = parsedRecord['name.firstName']?.trim();
    const lastName = parsedRecord['name.lastName']?.trim();
    const age = parseInt(parsedRecord['age'], 10);

    if (!firstName || !lastName || isNaN(age)) return null;

    const fullName = `${firstName} ${lastName}`;

    const addressFields = ['address.line1', 'address.line2', 'address.city', 'address.state'];
    const addressObj = {};
    addressFields.forEach(field => {
      const value = parsedRecord[field]?.trim();
      if (value) addressObj[field.split('.').pop()] = value;
    });
    const address = Object.keys(addressObj).length ? addressObj : null;

    const additionalInfo = {};
    Object.keys(parsedRecord).forEach(field => {
      if (!['name.firstName', 'name.lastName', 'age', ...addressFields].includes(field)) {
        const value = parsedRecord[field]?.trim();
        if (value) additionalInfo[field] = value;
      }
    });

    return {
      name: fullName,
      age,
      address,
      additional_info: Object.keys(additionalInfo).length ? additionalInfo : null
    };
  } catch (err) {
    return null;
  }
}

/**
 * Inserts a batch of validated DB rows.
 * Skips any null rows.
 * @param {Array<Object>} dbRows
 * @param {Object} dbClient
 */
async function insertBatch(dbRows, dbClient) {
  const validRows = dbRows.filter(row => row !== null);
  if (!validRows.length) return;

  const values = [];
  validRows.forEach(row => {
    values.push(row.name, row.age, row.address, row.additional_info);
  });

  await dbClient.query(INSERT_USERS_BATCH(validRows.length), values);
}

/**
 * Processes a CSV file and prepares database rows in batches.
 * Handles mandatory field validation, optional JSON fields, and batch insertion.
 * @param {string} csvFilePath
 */
async function processCsv(csvFilePath) {
  const dbClient = await pool.connect();
  let headers = [];
  let batchRows = [];
  let totalValidRecords = 0;
  let isHeaderLine = true;

  try {
    const fileStream = fs.createReadStream(csvFilePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    await dbClient.query('BEGIN');

    for await (const line of rl) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (isHeaderLine) {
        headers = trimmedLine.split(',').map(header => header.trim());
        isHeaderLine = false;
        continue;
      }

      const rowValues = trimmedLine.split(',').map(value => value.trim());
      while (rowValues.length < headers.length) rowValues.push('');

      const parsedRecord = {};
      headers.forEach((header, idx) => parsedRecord[header] = rowValues[idx]);

      const dbRow = mapCsvRecordToDbRow(parsedRecord);
      if (!dbRow) {
        logger.warn(`Skipping invalid row: ${trimmedLine}`);
        continue;
      }

      batchRows.push(dbRow);
      totalValidRecords++;

      if (batchRows.length >= BATCH_SIZE) {
        await insertBatch(batchRows, dbClient);
        batchRows = [];
      }
    }

    if (batchRows.length) await insertBatch(batchRows, dbClient);

    await dbClient.query('COMMIT');
    logger.info("CSV processing completed.");
  } catch (err) {
    await dbClient.query('ROLLBACK');
    logger.error('Fatal error during CSV processing. Transaction rolled back.', err.stack);
  } finally {
    dbClient.release();
    try {
      await generateReport();
    } catch (err) {
      logger.error('Age distribution report generation failed', err.stack);
    }
  }
}

module.exports = { processCsv };
