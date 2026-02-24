const db = require('../../config/database');

async function createGuestBookingsTable() {
  try {
    console.log('🔧 Creating guest_bookings table...');
    
    // Create the guest_bookings table
    const createTableSQL = `
      CREATE TABLE guest_bookings (
        guest_booking_id  bigint UNSIGNED NOT NULL AUTO_INCREMENT,
        guest_user_id     bigint UNSIGNED NOT NULL,   -- FK → users.user_id (the auto-created guest)
        vehicle_id        bigint UNSIGNED NOT NULL,   -- FK → vehicles.vehicle_id
        reservation_id    bigint UNSIGNED NOT NULL,   -- FK → reservations.reservation_id
        attendant_id      bigint UNSIGNED NOT NULL,   -- FK → users.user_id (the attendant who created it)
        created_at        timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guest_booking_id),
        CONSTRAINT fk_gb_guest       FOREIGN KEY (guest_user_id)   REFERENCES users(user_id)          ON DELETE CASCADE,
        CONSTRAINT fk_gb_vehicle     FOREIGN KEY (vehicle_id)      REFERENCES vehicles(vehicle_id)    ON DELETE CASCADE,
        CONSTRAINT fk_gb_reservation FOREIGN KEY (reservation_id)  REFERENCES reservations(reservation_id) ON DELETE CASCADE,
        CONSTRAINT fk_gb_attendant   FOREIGN KEY (attendant_id)    REFERENCES users(user_id)          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;
    
    await db.execute(createTableSQL);
    console.log('✅ guest_bookings table created successfully');
    
    // Verify table was created
    const tableExists = await db.tableExists('guest_bookings');
    if (tableExists) {
      console.log('✅ guest_bookings table exists and is ready');
      
      // Show table structure
      const structure = await db.query('DESCRIBE guest_bookings');
      console.log('📋 guest_bookings table structure:');
      structure.forEach(column => {
        console.log(`  - ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('❌ guest_bookings table was not created');
    }
    
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️ guest_bookings table already exists');
    } else {
      console.error('❌ Error creating guest_bookings table:', error);
    }
  } finally {
    if (db.connection) {
      await db.connection.end();
    }
    process.exit(0);
  }
}

createGuestBookingsTable();
