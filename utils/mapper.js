// File: utils/mapper.js

/**
 * Maps a parsed JSON object to the database row format.
 */
function mapRowToDb(parsedObject) {
  // Create a deep copy to safely manipulate
  const additional = JSON.parse(JSON.stringify(parsedObject));

  // 1. Map mandatory and designated fields
  const name = `${additional.name?.firstName || ''} ${additional.name?.lastName || ''}`.trim();
  const age = additional.age ? parseInt(additional.age, 10) : null;
  const address = additional.address || null;

  // 2. Remove the mapped properties from the 'additional' object
  if (additional.name) delete additional.name;
  if (additional.age) delete additional.age;
  if (additional.address) delete additional.address;

  // 3. Return the DB-ready structure
  // We must stringify JSON for the node-postgres driver to handle jsonb
  return {
    name: name,
    age: age,
    address: address ? JSON.stringify(address) : null,
    // Stringify the remaining properties
    additional_info: JSON.stringify(additional), 
  };
}

module.exports = { mapRowToDb };