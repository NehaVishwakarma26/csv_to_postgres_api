// File: services/reportService.js

const pool = require('../config/db');

/**
 * Calculates the age distribution and prints it to the console.
 */
async function generateReport() {
  const client = await pool.connect();
  try {
    const totalRes = await client.query('SELECT COUNT(*) AS total FROM users WHERE age IS NOT NULL');
    const total = parseInt(totalRes.rows[0].total, 10);

    if (total === 0) {
      console.log('\n--- Age Distribution Report ---');
      console.log('No users with age data found. Cannot generate report.');
      console.log('---------------------------------\n');
      return;
    }

    // FIXED QUERY — wrapped in subquery to safely use alias "age_group"
    const reportQuery = `
      SELECT age_group, COUNT(*) AS count
      FROM (
        SELECT
          CASE
            WHEN age < 20 THEN '< 20'
            WHEN age >= 20 AND age <= 40 THEN '20 to 40'
            WHEN age > 40 AND age <= 60 THEN '40 to 60'
            WHEN age > 60 THEN '> 60'
          END AS age_group
        FROM users
        WHERE age IS NOT NULL
      ) AS grouped
      GROUP BY age_group
      ORDER BY
        CASE age_group
          WHEN '< 20' THEN 1
          WHEN '20 to 40' THEN 2
          WHEN '40 to 60' THEN 3
          WHEN '> 60' THEN 4
        END;
    `;

    const reportRes = await client.query(reportQuery);

    console.log('\n--- Age Distribution Report ---');
    console.log('Age-Group    | % Distribution');
    console.log('---------------------------------');

    const allGroups = {
      '< 20': 0,
      '20 to 40': 0,
      '40 to 60': 0,
      '> 60': 0,
    };

    for (const row of reportRes.rows) {
      const percentage = ((row.count / total) * 100).toFixed(2);
      allGroups[row.age_group] = percentage;
    }

    // Print neatly
    console.log(`< 20         | ${allGroups['< 20']}%`.padEnd(30));
    console.log(`20 to 40     | ${allGroups['20 to 40']}%`.padEnd(30));
    console.log(`40 to 60     | ${allGroups['40 to 60']}%`.padEnd(30));
    console.log(`> 60         | ${allGroups['> 60']}%`.padEnd(30));
    console.log('---------------------------------\n');

  } catch (e) {
    console.error('Error generating report:', e.stack);
  } finally {
    client.release();
  }
}

module.exports = { generateReport };
