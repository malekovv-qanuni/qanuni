/**
 * Test SQL Server connection
 */

const database = require('./server/database');

async function testConnection() {
  console.log('Testing SQL Server connection...\n');

  try {
    // Test 1: Simple query
    console.log('Test 1: SELECT 1');
    const result = await database.execute('SELECT 1 AS test');
    console.log('Result:', result.recordset[0]);

    // Test 2: Get server version
    console.log('\nTest 2: Server version');
    const version = await database.getOne('SELECT @@VERSION AS version');
    console.log('SQL Server version:', version.version.split('\n')[0]);

    // Test 3: List databases
    console.log('\nTest 3: List databases');
    const databases = await database.getAll('SELECT name FROM sys.databases ORDER BY name');
    console.log('Databases found:', databases.length);
    databases.forEach(db => console.log('  -', db.name));

    console.log('\nAll tests passed! SQL Server connection working.\n');

  } catch (error) {
    console.error('\nConnection test failed:', error.message);
    process.exit(1);
  } finally {
    await database.close();
  }
}

testConnection();
