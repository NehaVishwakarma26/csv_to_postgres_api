require('dotenv').config();
const express = require('express');
const { processCsv } = require('./services/csvProcessor');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// CSV upload endpoint
app.post('/upload', async (req, res) => {
  const filePath = process.env.CSV_FILE_PATH;

  if (!filePath) {
    return res.status(500).json({
      error: 'Server configuration error: CSV_FILE_PATH is not set.'
    });
  }
  try {
    // Check asynchronously if the file exists
    await fs.access(filePath);
  } catch {
    return res.status(404).json({
      error: 'File not found at the configured path.',
      path: filePath
    });
  }

  // Trigger CSV processing asynchronously
  processCsv(filePath).catch(err => {
    console.error('Error during CSV processing:', err);
  });

  res.status(202).json({
    message: 'CSV processing accepted. Progress and report will be available in the server logs.'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
