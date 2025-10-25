// File: utils/parser.js

/**
 * Splits a CSV line into values.
 * Assumption: Commas are only delimiters, and fields do not contain commas.
 */
function parseCsvLine(line) {
  return line.split(',');
}

/**
 * Builds a nested JavaScript object from CSV headers and a row's values.
 * Handles "dot.notation.properties" to infinite depth.
 */
function buildObjectFromRow(headers, values) {
  const obj = {};

  headers.forEach((header, index) => {
    const keys = header.split('.');
    let current = obj;
    // Get the value, or set to null if it's an empty string
    const value = values[index] !== '' ? values[index] : null;

    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        // Last key in the path, assign the value
        current[key] = value;
      } else {
        // Not the last key, build the nested structure
        current[key] = current[key] || {};
        current = current[key];
      }
    });
  });

  return obj;
}

module.exports = { parseCsvLine, buildObjectFromRow };