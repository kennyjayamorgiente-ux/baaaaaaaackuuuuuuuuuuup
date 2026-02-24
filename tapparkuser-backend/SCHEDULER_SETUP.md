# Grace Period Scheduler Setup

This document explains how to set up automatic scheduling for the grace period checker script to run every 5 minutes.

## Option 1: Windows Task Scheduler

### Using Command Line (Recommended)

1. **Open Command Prompt as Administrator**

2. **Create the scheduled task:**
```cmd
schtasks /create /tn "TapPark Grace Period Checker" /tr "node \"C:\path\to\your\tapparkuser-backend\grace_period_checker.js\"" /sc minute /mo 5 /ru "SYSTEM" /rl HIGHEST
```

Replace `C:\path\to\your\tapparkuser-backend\` with your actual project path.

3. **Verify the task was created:**
```cmd
schtasks /query /tn "TapPark Grace Period Checker"
```

4. **Test the task immediately:**
```cmd
schtasks /run /tn "TapPark Grace Period Checker"
```

5. **Check the task history:**
```cmd
schtasks /query /tn "TapPark Grace Period Checker" /fo LIST /v
```

### Using GUI (Graphical Interface)

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create New Task**
   - Right-click "Task Scheduler Library" → "Create Task..."

3. **General Tab:**
   - Name: `TapPark Grace Period Checker`
   - Description: `Automatically expires old parking reservations`
   - Select "Run whether user is logged on or not"
   - Check "Run with highest privileges"

4. **Triggers Tab:**
   - Click "New..."
   - Begin the task: "On a schedule"
   - Settings: "Daily"
   - Repeat task every: "5 minutes"
   - For a duration of: "Indefinitely"
   - Enabled: ✅

5. **Actions Tab:**
   - Click "New..."
   - Action: "Start a program"
   - Program/script: `node`
   - Add arguments: `"C:\path\to\your\tapparkuser-backend\grace_period_checker.js"`
   - Start in: `"C:\path\to\your\tapparkuser-backend"`

6. **Conditions Tab:**
   - Uncheck "Start the task only if the computer is on AC power"
   - Uncheck "Stop if the computer switches to battery power"

7. **Settings Tab:**
   - Check "Allow task to be run on demand"
   - Check "Run task as soon as possible after a scheduled start is missed"
   - Check "If the task is already running, then the following rule: Do not start a new instance"

8. **Click OK** and enter your password if prompted

### Managing the Task

**View task status:**
```cmd
schtasks /query /tn "TapPark Grace Period Checker"
```

**Run immediately:**
```cmd
schtasks /run /tn "TapPark Grace Period Checker"
```

**Stop the task:**
```cmd
schtasks /end /tn "TapPark Grace Period Checker"
```

**Delete the task:**
```cmd
schtasks /delete /tn "TapPark Grace Period Checker" /f
```

**Disable the task:**
```cmd
schtasks /change /tn "TapPark Grace Period Checker" /disable
```

**Enable the task:**
```cmd
schtasks /change /tn "TapPark Grace Period Checker" /enable
```

## Option 2: Linux/Mac Cron Job

### Setup Cron Job

1. **Open crontab editor:**
```bash
crontab -e
```

2. **Add the following line to run every 5 minutes:**
```bash
*/5 * * * * cd /path/to/your/tapparkuser-backend && /usr/bin/node grace_period_checker.js >> /var/log/tappark-grace-period.log 2>&1
```

Replace `/path/to/your/tapparkuser-backend` with your actual project path.

3. **Save and exit** the editor

### Cron Schedule Explanation
```
*/5 * * * * 
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59, */5 = every 5 minutes)
```

### Managing Cron Job

**View current cron jobs:**
```bash
crontab -l
```

**Edit cron jobs:**
```bash
crontab -e
```

**Remove all cron jobs:**
```bash
crontab -r
```

**Check cron logs (Ubuntu/Debian):**
```bash
tail -f /var/log/cron.log
```

**Check cron logs (CentOS/RHEL):**
```bash
tail -f /var/log/cron
```

**Check application logs:**
```bash
tail -f /var/log/tappark-grace-period.log
```

## Option 3: Node-cron (Run within Node.js App)

If you prefer to run the checker within your existing Node.js application:

1. **Install node-cron:**
```bash
npm install node-cron
```

2. **Add to your main server.js:**
```javascript
const cron = require('node-cron');
const GracePeriodChecker = require('./grace_period_checker');

// Schedule to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running scheduled grace period check...');
  const checker = new GracePeriodChecker();
  await checker.run();
}, {
  scheduled: true,
  timezone: 'UTC'
});

console.log('Grace period checker scheduled to run every 5 minutes');
```

## Testing the Setup

### Manual Test
```bash
# Test the script manually first
cd /path/to/your/tapparkuser-backend
node grace_period_checker.js

# Run the test suite
node test_grace_period.js
```

### Verify Scheduled Execution

**Windows:**
```cmd
# Check task history
schtasks /query /tn "TapPark Grace Period Checker" /fo LIST /v

# Check Event Viewer for task scheduler logs
eventvwr.msc
```

**Linux/Mac:**
```bash
# Wait 5 minutes, then check logs
tail -f /var/log/tappark-grace-period.log

# Check if cron is running
ps aux | grep cron
```

## Troubleshooting

### Common Issues

1. **Path Issues**: Always use absolute paths in scheduled tasks
2. **Permissions**: Run with appropriate privileges (SYSTEM on Windows, appropriate user on Linux)
3. **Environment Variables**: The scheduled task may not have the same environment as your user session
4. **Database Connection**: Ensure the database is accessible when the task runs

### Debugging Steps

1. **Test manually first**: Always verify the script works when run manually
2. **Check logs**: Look for error messages in the log files
3. **Verify paths**: Ensure all file paths are correct and accessible
4. **Test permissions**: Run the task with the same user account that will execute it

### Log Locations

**Windows:**
- Task Scheduler logs: Event Viewer → Windows Logs → Application
- Application logs: Check your console output or redirect to a file

**Linux/Mac:**
- Cron logs: `/var/log/cron.log` or `/var/log/cron`
- Application logs: `/var/log/tappark-grace-period.log`

## Maintenance

**Monitor the logs regularly** to ensure the grace period checker is running correctly:

```bash
# Windows - Check recent task history
schtasks /query /tn "TapPark Grace Period Checker" /fo LIST | findstr "Last Run Time"

# Linux - Check recent logs
tail -20 /var/log/tappark-grace-period.log
```

**Set up log rotation** to prevent log files from growing too large:

```bash
# Add to your crontab for weekly log rotation
0 0 * * 0 mv /var/log/tappark-grace-period.log /var/log/tappark-grace-period.log.1 && touch /var/log/tappark-grace-period.log
```
