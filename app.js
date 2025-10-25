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

// Routes
app.get('/', (req, res) => res.status(200).json({ status: 'API is running' }));
app.post('/upload', async (req, res) => { /* CSV processing code */ });

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
