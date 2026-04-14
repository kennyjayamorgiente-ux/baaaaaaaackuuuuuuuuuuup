# Tappark MIS Integration

This folder contains the backend integration layer for the FoundationU MIS Tappark API.

## Files

- `config.js`: reads Tappark-related environment variables
- `client.js`: reusable API client with access-token refresh support
- `index.js`: convenience export for the module

## Environment variables

Add these to `.env` before wiring routes:

```env
TAPPARK_OWNER=tappark
TAPPARK_SYSTEM=tappark
TAPPARK_BASE_URL=https://mis.foundationu.com/api/tappark
TAPPARK_REFRESH_URL=https://mis.foundationu.com/api/token/refresh
TAPPARK_ACCESS_TOKEN=
TAPPARK_REFRESH_TOKEN=
TAPPARK_EXPIRES_AT=
TAPPARK_TIMEOUT_MS=15000
```

## Refresh behavior

This Node integration now follows the same refresh pattern as your working CodeIgniter controller:

- use the current `TAPPARK_ACCESS_TOKEN` for requests
- when the API returns `401`, call `TAPPARK_REFRESH_URL`
- send `TAPPARK_REFRESH_TOKEN` as `Authorization: Bearer <refresh_token>`
- replace the in-memory access token with the new token from the refresh response

## Supported client methods

- `getStudent(studentId)`
- `searchStudents(search)`
- `loginStudent(studentId, password)`
- `getEmployee(employeeId)`
- `searchEmployees(search)`
- `loginEmployee(employeeId, password)`
