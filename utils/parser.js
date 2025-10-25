/**
 * File: utils/parser.js
 * Description: Parses CSV lines into values and builds nested objects from headers and row values.
 *              Supports dot-notation headers for nested properties.
 */

const logger = require('../config/logger');

/**
 * Splits a CSV line into values.
 * Assumption: Fields do not contain commas; otherwise a proper CSV parser should be used.
 * @param {string} line - Single CSV line
 * @returns {Array<string>} Array of values
 */
function parseCsvLine(line) {
  if (typeof line !== 'string') {
    logger.warn('Invalid CSV line input, expected string:', line);
    return [];
  }
  return line.split(',').map((value) => value.trim());
}

/**
 * Builds a nested JavaScript object from CSV headers and row values.
 * Supports headers with dot notation for nested objects (e.g., "address.city").
 * @param {Array<string>} headers - CSV header fields
 * @param {Array<string>} values - CSV row values
 * @returns {Object} Nested object representing the row
 */
function buildObjectFromRow(headers, values) {
  if (!Array.isArray(headers) || !Array.isArray(values)) {
    throw new Error('Headers and values must be arrays');
  }

  const result = {};

  headers.forEach((header, index) => {
    const keys = header.split('.');
    let current = result;
    const value = values[index] !== '' ? values[index] : null;

    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        current[key] = value;
      } else {
        current[key] = current[key] || {};
        current = current[key];
      }
    });
  });

  return result;
}

module.exports = { parseCsvLine, buildObjectFromRow };
