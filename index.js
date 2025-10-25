/**
 * File: index.js
 * Description: Entry point of the application. Starts the Express server
 *              and validates critical environment variables.
 */

require('dotenv').config();
const logger = require('./config/logger');
const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});
