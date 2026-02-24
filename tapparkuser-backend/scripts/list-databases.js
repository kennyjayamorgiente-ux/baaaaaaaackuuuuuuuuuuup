const mysql = require('mysql2/promise');
require('dotenv').config();

const listDatabases = async () => {
  try {
    console.log('🔍 Listing all databases...');

    // Connect without specifying database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    // List all databases
    const [databases] = await connection.execute('SHOW DATABASES');
    
    console.log('📋 Available databases:');
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });

    // Check if tappark exists
    const tapparkExists = databases.some(db => db.Database === 'tappark');
    if (tapparkExists) {
      console.log('✅ Database "tappark" exists!');
    } else {
      console.log('❌ Database "tappark" does not exist.');
      console.log('💡 You can create it with: npm run create-db');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Failed to list databases:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Check your database credentials in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure MySQL server is running');
    }
    
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  listDatabases()
    .then(() => {
      console.log('🎉 Database listing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database listing failed:', error);
      process.exit(1);
    });
}

module.exports = { listDatabases };
