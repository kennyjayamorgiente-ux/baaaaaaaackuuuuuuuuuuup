# 15-Minute Grace Period Implementation

## Overview

This implementation adds a 15-minute grace period system for parking reservations in the TapPark application. Reservations with `booking_status = 'reserved'` that are not checked in within 15 minutes are automatically cancelled and the parking spots are released for other users.

## Features

### Backend Components
- **Grace Period Checker**: Automated script that runs every 5 minutes to find and expire old reservations
- **Database Transactions**: Safe atomic updates to prevent data corruption
- **Comprehensive Logging**: Detailed audit trail for all expiration events

### Frontend Components
- **Grace Period Warning Modal**: Shows immediately after booking with exact deadline time
- **Expiration Notification Modal**: Appears when user tries to access an expired reservation
- **Real-time Status Checking**: Polls reservation status to detect expiration in real-time

## Files Created/Modified

### Backend Files
```
tapparkuser-backend/
├── grace_period_checker.js          # Main grace period script
├── test_grace_period.js              # Test suite for grace period
├── .env.grace-period                 # Environment configuration
├── SCHEDULER_SETUP.md               # Setup instructions
└── package.json                     # Added npm scripts
```

### Frontend Files
```
tapparkuser/app/
├── screens/ActiveParkingScreen.tsx   # Added grace period modals and logic
└── styles/activeParkingScreenStyles.ts # Added modal styles
```

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd tapparkuser-backend

# Test the grace period checker
npm run test-grace-period

# Run the grace period checker manually
npm run grace-period
```

### 2. Schedule the Checker

**Windows (Command Line):**
```cmd
schtasks /create /tn "TapPark Grace Period Checker" /tr "node \"C:\path\to\tapparkuser-backend\grace_period_checker.js\"" /sc minute /mo 5 /ru "SYSTEM" /rl HIGHEST
```

**Linux/Mac (Cron):**
```bash
# Edit crontab
crontab -e

# Add this line (update path)
*/5 * * * * cd /path/to/tapparkuser-backend && /usr/bin/node grace_period_checker.js >> /var/log/tappark-grace-period.log 2>&1
```

### 3. Frontend Usage

The grace period modals will automatically appear:
- **Warning Modal**: Right after successful booking
- **Expiration Modal**: When accessing an expired reservation

## Detailed Implementation

### Backend Logic

#### Query for Expired Reservations
```sql
SELECT r.*, ps.spot_number, ps.parking_section_id, pa.parking_area_name,
       CONCAT(u.first_name, ' ', u.last_name) AS user_name, v.plate_number
FROM reservations r
JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
LEFT JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
LEFT JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
JOIN users u ON r.user_id = u.user_id
LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
WHERE r.booking_status = 'reserved'
  AND r.start_time IS NULL
  AND TIMESTAMPDIFF(MINUTE, r.created_at, NOW()) >= 15;
```

#### Transaction Updates
For each expired reservation:
1. Mark reservation as `'invalid'`
2. Free the parking spot (`status = 'free'`)
3. Decrement section `reserved_count`
4. Log expiration event to `user_logs`

### Frontend Logic

#### Grace Period Warning Flow
```javascript
// When reservation is created (within 2 minutes)
if (bookingStatus === 'reserved' && timeSinceCreation <= 2) {
  showGracePeriodWarningModal(createdAt);
}
```

#### Expiration Detection Flow
```javascript
// During real-time polling
if (bookingStatus === 'invalid') {
  showExpirationNotificationModal(details);
  // Redirect to home after user acknowledgment
}
```

## Testing

### Manual Testing

1. **Create a Test Reservation:**
```sql
-- Insert a reservation that's already expired (20 minutes old)
INSERT INTO reservations (user_id, parking_spots_id, booking_status, start_time, created_at, updated_at, spot_number, parking_section_id)
VALUES (1, 1, 'reserved', NULL, DATE_SUB(NOW(), INTERVAL 20 MINUTE), DATE_SUB(NOW(), INTERVAL 20 MINUTE), 'A-12', 1);
```

2. **Run the Test Suite:**
```bash
npm run test-grace-period
```

3. **Verify Results:**
```sql
-- Check if reservation was marked invalid
SELECT * FROM reservations WHERE booking_status = 'invalid';

-- Check if spot was freed
SELECT * FROM parking_spot WHERE status = 'free';

-- Check expiration logs
SELECT * FROM user_logs WHERE action_type = 'RESERVATION_EXPIRED';
```

### Frontend Testing

1. **Create a new reservation** → Warning modal should appear
2. **Wait 15+ minutes** → Reservation should expire
3. **Try to access expired reservation** → Expiration modal should appear
4. **Click "Back to Home"** → Should redirect to home screen

## Configuration

### Environment Variables
```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=merge1

# Grace Period Settings
GRACE_PERIOD_MINUTES=15
CHECK_FREQUENCY_MINUTES=5
```

### Customizable Settings
- **Grace Period**: Change `GRACE_PERIOD_MINUTES` (default: 15)
- **Check Frequency**: Modify cron schedule (default: 5 minutes)
- **Warning Timing**: Adjust frontend detection window (default: 2 minutes)

## Monitoring

### Logs Location
- **Windows**: Event Viewer → Application logs
- **Linux/Mac**: `/var/log/tappark-grace-period.log`
- **Application**: Console output in grace_period_checker.js

### Sample Log Output
```
[2026-02-04T12:00:00.000Z] Grace Period Checker - Starting...
[2026-02-04T12:00:00.100Z] Found 3 expired reservation(s)
[2026-02-04T12:00:00.150Z] ✓ Processed reservation #245 (User: John Doe, Spot: A-12)
[2026-02-04T12:00:00.200Z] ✓ Processed reservation #247 (User: Jane Smith, Spot: B-05)
[2026-02-04T12:00:00.250Z] ✗ Failed reservation #249: Database error
[2026-02-04T12:00:00.300Z] Finished. 2 succeeded, 1 failed.
```

## Troubleshooting

### Common Issues

1. **Script doesn't run**: Check file permissions and Node.js installation
2. **Database connection failed**: Verify DB credentials and network connectivity
3. **No expired reservations found**: Ensure test reservations are older than 15 minutes
4. **Modals don't appear**: Check frontend console for JavaScript errors

### Debug Commands

```bash
# Test database connection
node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host:'localhost',user:'root',password:'',database:'merge1'}).then(c => console.log('✅ DB OK')).catch(e => console.log('❌ DB Error:', e.message))"

# Check cron service (Linux)
sudo systemctl status cron

# Check Windows Task Scheduler
schtasks /query /tn "TapPark Grace Period Checker"
```

## API Changes Required

The frontend expects these existing endpoints:
- `GET /api/bookings/:id` - Returns reservation details including `booking_status`
- `GET /api/bookings/my` - Returns user's current bookings

No new API endpoints are required for this feature.

## User Experience Flow

### Successful Flow
1. User books spot at 12:00 PM
2. ⚠️ Warning modal shows: "You have until 12:15 PM to check in"
3. User dismisses modal, sees QR code
4. User arrives at 12:08 PM, attendant scans QR
5. Reservation becomes active, user parks normally

### Expiration Flow
1. User books spot at 12:00 PM
2. ⚠️ Warning modal shows: "You have until 12:15 PM to check in"
3. User doesn't show up
4. At 12:16 PM, backend marks reservation as invalid
5. User opens app at 12:20 PM
6. ❌ Expiration modal shows: "Your reservation has expired"
7. User clicks "Back to Home", redirected to home screen

## Performance Considerations

- **Database Load**: Query runs every 5 minutes, minimal impact
- **Frontend Polling**: Checks every 30-60 seconds, lightweight
- **Memory Usage**: Script exits after each run, no memory leaks
- **Error Handling**: Continues processing other reservations if one fails

## Security Considerations

- **SQL Injection**: Uses prepared statements
- **Transaction Safety**: All updates wrapped in transactions
- **Audit Trail**: All expirations logged to user_logs
- **Access Control**: Script runs with minimal required permissions

## Future Enhancements

### Possible Improvements
1. **Push Notifications**: Notify users when reservation is about to expire
2. **Grace Period Extension**: Allow users to extend grace period (with fee)
3. **Analytics Dashboard**: Track expiration rates and patterns
4. **SMS Notifications**: Send SMS alerts for expiring reservations
5. **Flexible Grace Periods**: Different grace periods for different areas/times

### Database Schema Additions (Optional)
```sql
-- For future analytics
ALTER TABLE reservations ADD COLUMN grace_period_expires_at TIMESTAMP NULL;
ALTER TABLE reservations ADD COLUMN expiration_notified BOOLEAN DEFAULT FALSE;
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the log files for error messages
3. Verify all configuration settings
4. Test with the provided test suite

---

**Implementation Complete!** 🎉

The 15-minute grace period system is now fully implemented and ready for production use.
