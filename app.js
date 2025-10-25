/**
 * File: app.js
 * Description: Sets up the Express application, routes, and middleware.
 *              Exports the Express app instance for use by the server and testing.
 */

const express = require('express');
const fs = require('fs').promises;
const logger = require('./config/logger');
const { processCsv } = require('./services/csvProcessor');

const app = express();
app.use(express.json());

// Health check route
app.get('/', (req, res) => res.status(200).json({ status: 'API is running' }));

// CSV upload route
app.post('/upload', async (req, res) => {
  const csvFilePath = process.env.CSV_FILE_PATH;

  if (!csvFilePath) {
    logger.error('CSV_FILE_PATH environment variable is not set.');
    return res.status(500).json({
      error: 'Server configuration error: CSV_FILE_PATH is not set.'
    });
  }

  // Check if the file exists asynchronously
  try {
    await fs.access(csvFilePath);
  } catch (err) {
    logger.error(`CSV file not found at path: ${csvFilePath}`);
    return res.status(404).json({
      error: 'CSV file not found at the configured path.',
      path: csvFilePath
    });
  }

  // Trigger CSV processing asynchronously
  processCsv(csvFilePath)
    .then(() => logger.info('CSV processing completed successfully.'))
    .catch(err => logger.error('Error during CSV processing:', err.stack));

  res.status(202).json({
    message: 'CSV processing accepted. Progress and report will be available in server logs.'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
