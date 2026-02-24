const db = require('../../config/database');

async function checkTypesTable() {
  try {
    console.log('🔍 Checking types table structure...');
    
    // Check if table exists
    const tableExists = await db.tableExists('types');
    if (!tableExists) {
      console.log('❌ Types table does not exist');
      return;
    }
    
    console.log('✅ Types table exists');
    
    // Get table structure
    const structure = await db.query('DESCRIBE types');
    console.log('📋 Types table structure:');
    structure.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Get all data
    const data = await db.query('SELECT * FROM types');
    console.log(`📊 Types table data (${data.length} rows):`);
    data.forEach(row => {
      console.log(`  - ID: ${row.type_id}, Name: ${row.account_type_name}`);
    });
    
    // Check if guest type exists
    const guestType = data.find(row => row.account_type_name.toLowerCase() === 'guest');
    if (guestType) {
      console.log(`✅ Guest type exists: ID ${guestType.type_id}, Name: ${guestType.account_type_name}`);
    } else {
      console.log('❌ Guest type does not exist');
      
      // Add guest type
      console.log('➕ Adding guest type...');
      const insertResult = await db.query(
        'INSERT INTO types (account_type_name) VALUES (?)',
        ['Guest']
      );
      console.log(`✅ Guest type added with ID: ${insertResult.insertId}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking types table:', error);
  } finally {
    if (db.connection) {
      await db.connection.end();
    }
    process.exit(0);
  }
}

checkTypesTable();
