/**
 * File: utils/mapper.js
 * Description: Maps a parsed JavaScript object to the database row format.
 *              Handles optional fields and stringifies JSON data for insertion into PostgreSQL.
 */

/**
 * Maps a parsed object (from CSV/JSON) to a database row format suitable for insertion.
 * Ensures JSON fields are stringified for Postgres jsonb columns.
 * @param {Object} parsedObject - The parsed user object
 * @returns {Object} DB-ready user row
 */
function mapRowToDb(parsedObject) {
  if (!parsedObject || typeof parsedObject !== 'object') {
    throw new Error('Invalid input: parsedObject must be a non-null object');
  }

  // Destructure fields for clarity
  const { name: nameObj, age: rawAge, address: addressObj, ...otherFields } = parsedObject;

  const fullName = `${nameObj?.firstName || ''} ${nameObj?.lastName || ''}`.trim();
  const age = rawAge ? parseInt(rawAge, 10) : null;
  const address = addressObj ? JSON.stringify(addressObj) : null;

  // The remaining fields are treated as additional_info
  const additionalInfo = Object.keys(otherFields).length > 0 
    ? JSON.stringify(otherFields) 
    : JSON.stringify({});

  return {
    name: fullName,
    age: age,
    address: address,
    additional_info: additionalInfo,
  };
}

module.exports = { mapRowToDb };
