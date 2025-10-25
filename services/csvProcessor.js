const fs = require('fs');
const readline = require('readline');
const pool = require('../config/db');
const { parseCsvLine, buildObjectFromRow } = require('../utils/parser');
const { mapRowToDb } = require('../utils/mapper');
const { generateReport } = require('./reportService');

const BATCH_SIZE = 1000; // Number of records to insert per batch

async function insertBatch(batch, client) {
  // Prepare values array and dynamic placeholders for multi-row insert
  const values = [];
  const queryParams = batch.map((row, index) => {
    const i = index * 4; // 4 columns per row
    values.push(row.name, row.age, row.address, row.additional_info);
    return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4})`;
  }).join(',');

  const queryText = `
    INSERT INTO users (name, age, address, additional_info)
    VALUES ${queryParams}
  `;

  await client.query(queryText, values);
}

async function processCsv(filePath) {
  console.log('Starting CSV processing...');
  const client = await pool.connect(); // Acquire a client from the pool

  try {
    // Create a read stream and readline interface for streaming CSV lines
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity // Handle different line endings
    });

    let headers = [];
    let batch = [];
    let isFirstLine = true;
    let totalCount = 0;

    // Begin transaction for batch inserts
    await client.query('BEGIN');

    for await (const line of rl) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) continue;

      // Parse headers from the first line
      if (isFirstLine) {
        headers = parseCsvLine(trimmedLine);
        isFirstLine = false;
        continue;
      }

      const values = parseCsvLine(trimmedLine);

      // Skip rows where column count does not match headers
      if (values.length !== headers.length) {
        console.warn('Skipping malformed row (column mismatch):', trimmedLine);
        continue;
      }

      try {
        // Convert CSV row to nested JavaScript object
        const parsedObject = buildObjectFromRow(headers, values);

        // Map nested object to database row format
        const dbRow = mapRowToDb(parsedObject);

        batch.push(dbRow);
        totalCount++;

        // Insert batch if it reaches the configured size
        if (batch.length >= BATCH_SIZE) {
          await insertBatch(batch, client);
          console.log(`Inserted batch of ${batch.length} records.`);
          batch = []; // Reset batch
        }
      } catch (error) {
        console.error('Error parsing row, skipping:', trimmedLine, error);
      }
    }

    // Insert any remaining rows after loop completes
    if (batch.length > 0) {
      await insertBatch(batch, client);
      console.log(`Inserted final batch of ${batch.length} records.`);
    }

    // Commit transaction after all inserts succeed
    await client.query('COMMIT');
    console.log(`CSV processing completed. Total records processed: ${totalCount}.`);
  } catch (error) {
    // Rollback transaction on fatal error
    await client.query('ROLLBACK');
    console.error('Fatal error during CSV processing. Transaction rolled back.', error.stack);
  } finally {
    client.release(); // Release client back to pool

    // Generate age distribution report after processing
    console.log('Generating age distribution report...');
    await generateReport();
  }
}

module.exports = { processCsv };
