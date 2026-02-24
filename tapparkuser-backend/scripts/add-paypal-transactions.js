const db = require('../config/database');

async function addPayPalTransactionsTable() {
  try {
    console.log('🔄 Updating database for PayPal integration...');

    // Step 1: Add payment_type column to payments table if it doesn't exist
    console.log('📝 Checking payments table for payment_type column...');
    try {
      await db.query(`
        ALTER TABLE payments 
        ADD COLUMN payment_type VARCHAR(50) DEFAULT 'manual' AFTER subscription_id
      `);
      console.log('✅ Added payment_type column to payments table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  payment_type column already exists');
      } else {
        throw error;
      }
    }

    // Step 2: Create paypal_transactions table
    console.log('📝 Creating paypal_transactions table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS paypal_transactions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        plan_id BIGINT UNSIGNED NOT NULL,
        paypal_order_id VARCHAR(100) NOT NULL UNIQUE,
        capture_id VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('created', 'approved', 'completed', 'cancelled', 'failed') DEFAULT 'created',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES plans(plan_id) ON DELETE RESTRICT,
        INDEX idx_user_id (user_id),
        INDEX idx_order_id (paypal_order_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('✅ PayPal transactions table created successfully');

    // Check if table was created
    const tables = await db.query('SHOW TABLES LIKE "paypal_transactions"');
    if (tables.length > 0) {
      console.log('✅ Table verified');
      
      // Show table structure
      const structure = await db.query('DESCRIBE paypal_transactions');
      console.log('📋 Table structure:');
      structure.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `(${col.Key})` : ''}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating PayPal transactions table:', error);
    process.exit(1);
  }
}

addPayPalTransactionsTable();
