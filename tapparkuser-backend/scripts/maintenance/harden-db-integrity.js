const db = require('../../config/database');

const ensureIndex = async (tableName, indexName, createSql) => {
  const existing = await db.query(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?
     LIMIT 1`,
    [tableName, indexName]
  );

  if (existing.length > 0) {
    console.log(`= Index exists: ${tableName}.${indexName}`);
    return;
  }

  await db.query(createSql);
  console.log(`+ Index created: ${tableName}.${indexName}`);
};

const ensureTable = async (tableName, createSql) => {
  const exists = await db.tableExists(tableName);
  if (exists) {
    console.log(`= Table exists: ${tableName}`);
    return;
  }
  await db.query(createSql);
  console.log(`+ Table created: ${tableName}`);
};

async function hardenDbIntegrity() {
  try {
    console.log('Starting DB integrity hardening...');

    await ensureTable(
      'capacity_spot_status',
      `CREATE TABLE capacity_spot_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_section_id INT NOT NULL,
        spot_number VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'unavailable',
        updated_by INT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_section_spot (parking_section_id, spot_number),
        INDEX idx_capacity_status_section (parking_section_id),
        INDEX idx_capacity_status_type (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );

    await ensureIndex(
      'reservations',
      'idx_reservation_section_spot_status',
      'CREATE INDEX idx_reservation_section_spot_status ON reservations (parking_section_id, spot_number, booking_status)'
    );

    await ensureIndex(
      'reservations',
      'idx_reservation_user_status',
      'CREATE INDEX idx_reservation_user_status ON reservations (user_id, booking_status)'
    );

    await ensureIndex(
      'reservations',
      'idx_reservation_status_timestamp',
      'CREATE INDEX idx_reservation_status_timestamp ON reservations (booking_status, time_stamp)'
    );

    await ensureIndex(
      'reservations',
      'idx_reservation_qr_key',
      'CREATE INDEX idx_reservation_qr_key ON reservations (qr_key)'
    );

    await ensureIndex(
      'guest_bookings',
      'uq_guest_bookings_reservation',
      'CREATE UNIQUE INDEX uq_guest_bookings_reservation ON guest_bookings (reservation_id)'
    );

    await ensureIndex(
      'payments',
      'idx_payments_user_date',
      'CREATE INDEX idx_payments_user_date ON payments (user_id, payment_date)'
    );

    await ensureIndex(
      'penalty',
      'idx_penalty_user',
      'CREATE INDEX idx_penalty_user ON penalty (user_id)'
    );

    console.log('DB integrity hardening complete.');
    process.exit(0);
  } catch (error) {
    console.error('DB integrity hardening failed:', error.message);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

hardenDbIntegrity();
