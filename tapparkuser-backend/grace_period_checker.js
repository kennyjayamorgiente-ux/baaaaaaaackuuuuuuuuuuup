const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration
const GRACE_PERIOD_MINUTES = parseInt(process.env.GRACE_PERIOD_MINUTES) || 15;
const DB_NAME = process.env.DB_NAME || 'merge1';

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

/**
 * Grace Period Checker - Automatically expires old reservations
 * 
 * This script runs periodically to find and invalidate reservations that:
 * 1. Have booking_status = 'pending'
 * 2. Have start_time IS NULL (user hasn't checked in)
 * 3. Are older than GRACE_PERIOD_MINUTES from creation time
 */
class GracePeriodChecker {
  constructor() {
    this.connection = null;
  }

  /**
   * Initialize database connection
   */
  async connect() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log(`[${new Date().toISOString()}] Connected to database: ${DB_NAME}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Database connection failed:`, error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log(`[${new Date().toISOString()}] Database connection closed`);
    }
  }

  /**
   * Find expired reservations
   */
  async findExpiredReservations() {
    const query = `
      SELECT 
        r.reservation_id,
        r.user_id,
        r.parking_spots_id,
        r.time_stamp,
        ps.spot_number,
        ps.parking_section_id,
        pa.parking_area_name,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        v.plate_number
      FROM reservations r
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      LEFT JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      LEFT JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.booking_status = 'reserved'
        AND r.start_time IS NULL
        AND TIMESTAMPDIFF(MINUTE, r.time_stamp, NOW()) >= ?
    `;

    try {
      const [rows] = await this.connection.execute(query, [GRACE_PERIOD_MINUTES]);
      return rows;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error finding expired reservations:`, error);
      throw error;
    }
  }

  /**
   * Process a single expired reservation
   */
  async processExpiredReservation(reservation) {
    const transaction = await this.connection.beginTransaction();
    
    try {
      const {
        reservation_id,
        user_id,
        parking_spots_id,
        time_stamp,
        spot_number,
        parking_section_id,
        parking_area_name = 'Unknown Area',
        user_name = 'Unknown User',
        plate_number = 'Unknown Vehicle'
      } = reservation;

      // 1. Mark reservation as invalid and set waiting_end_time
      await this.connection.execute(
        `UPDATE reservations 
         SET booking_status = 'invalid', 
             waiting_end_time = NOW(),
             updated_at = NOW() 
         WHERE reservation_id = ?`,
        [reservation_id]
      );

      // 2. Update parking spot status to available
      await this.connection.execute(
        `UPDATE parking_spot 
         SET status = ?, 
             is_occupied = 0, 
             occupied_by = NULL, 
             occupied_at = NULL 
         WHERE parking_spot_id = ?`,
        ['available', parking_spots_id]
      );

      // 3. Decrement section reserved count (only if parking_section_id is not null)
      if (parking_section_id) {
        await this.connection.execute(
          `UPDATE parking_section 
           SET reserved_count = GREATEST(reserved_count - 1, 0) 
           WHERE parking_section_id = ?`,
          [parking_section_id]
        );
      }

      // 4. Log the expiration
      const description = `Reservation expired: ${user_name} did not check in within ${GRACE_PERIOD_MINUTES} minutes for spot ${spot_number} at ${parking_area_name}. Vehicle: ${plate_number}`;
      
      await this.connection.execute(
        `INSERT INTO user_logs (user_id, target_id, action_type, description, timestamp) 
         VALUES (?, ?, 'RESERVATION_EXPIRED', ?, NOW())`,
        [user_id, reservation_id, description]
      );

      await transaction.commit();

      console.log(`[${new Date().toISOString()}] ✓ Processed reservation #${reservation_id} (User: ${user_name}, Spot: ${spot_number})`);
      
      return {
        success: true,
        reservation_id,
        user_name,
        spot_number,
        parking_area_name
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`[${new Date().toISOString()}] ✗ Failed reservation #${reservation.reservation_id}:`, error.message);
      
      return {
        success: false,
        reservation_id: reservation.reservation_id,
        error: error.message
      };
    }
  }

  /**
   * Main execution method
   */
  async run() {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Grace Period Checker - Starting...`);
    console.log(`[${new Date().toISOString()}] Grace period: ${GRACE_PERIOD_MINUTES} minutes`);

    try {
      await this.connect();

      // Find expired reservations
      const expiredReservations = await this.findExpiredReservations();
      
      if (expiredReservations.length === 0) {
        console.log(`[${new Date().toISOString()}] No expired reservations found`);
      } else {
        console.log(`[${new Date().toISOString()}] Found ${expiredReservations.length} expired reservation(s)`);

        // Process each expired reservation
        let successCount = 0;
        let failCount = 0;

        for (const reservation of expiredReservations) {
          const result = await this.processExpiredReservation(reservation);
          
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        }

        console.log(`[${new Date().toISOString()}] Finished. ${successCount} succeeded, ${failCount} failed.`);
      }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Grace Period Checker failed:`, error);
      // Don't exit process when running within server
      if (require.main === module) {
        process.exit(1);
      }
    } finally {
      await this.disconnect();
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Grace Period Checker completed in ${duration}ms`);
    }
  }
}

// Run the checker if this file is executed directly
if (require.main === module) {
  const checker = new GracePeriodChecker();
  checker.run().catch(error => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, error);
    process.exit(1);
  });
}

module.exports = GracePeriodChecker;
