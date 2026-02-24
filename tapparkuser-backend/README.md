# Tapparkuser Backend API

A comprehensive backend API for the Tapparkuser parking management application built with Node.js, Express, and MySQL.

## Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access
- 🚗 **Vehicle Management** - Add, update, delete, and manage user vehicles
- 🅿️ **Parking Management** - Start/end parking sessions with real-time tracking
- 📱 **QR Code Integration** - Generate and scan QR codes for parking sessions
- 💳 **Payment Processing** - Wallet top-up and parking fee payments
- ⭐ **Favorites** - Save favorite parking locations
- 📊 **Analytics & History** - Comprehensive user statistics and history
- 🔔 **Notifications** - Real-time notifications system
- 🛡️ **Security** - Rate limiting, input validation, and secure password handling

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **QR Codes**: qrcode
- **Security**: helmet, cors, express-rate-limit

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tapparkuser-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=tapparkuser
   DB_USER=root
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE tapparkuser;
   ```

5. **Run Database Migration**
   ```bash
   npm run migrate
   ```

6. **Seed Sample Data (Optional)**
   ```bash
   npm run seed
   ```

7. **Start the Server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify/:token` - Verify email

### Users
- `GET /api/users/notifications` - Get user notifications
- `PATCH /api/users/notifications/:id/read` - Mark notification as read
- `PATCH /api/users/notifications/read-all` - Mark all notifications as read
- `DELETE /api/users/notifications/:id` - Delete notification
- `GET /api/users/dashboard` - Get dashboard data
- `PUT /api/users/profile-image` - Update profile image
- `GET /api/users/stats` - Get user statistics

### Vehicles
- `GET /api/vehicles` - Get user vehicles
- `GET /api/vehicles/:id` - Get specific vehicle
- `POST /api/vehicles` - Add new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle
- `PATCH /api/vehicles/:id/set-default` - Set default vehicle

### Parking
- `GET /api/parking/locations` - Get parking locations
- `GET /api/parking/locations/:id` - Get specific location
- `POST /api/parking/start` - Start parking session
- `POST /api/parking/end/:sessionId` - End parking session
- `GET /api/parking/active` - Get active session
- `GET /api/parking/history` - Get parking history

### QR Codes
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/scan` - Scan QR code (authenticated)
- `POST /api/qr/validate` - Validate QR code (public)
- `GET /api/qr/current-session` - Get current session QR

### Payments
- `GET /api/payments/history` - Get payment history
- `POST /api/payments/topup` - Top up wallet
- `GET /api/payments/balance` - Get current balance
- `POST /api/payments/parking/:sessionId` - Process parking payment
- `GET /api/payments/stats` - Get payment statistics

### Favorites
- `GET /api/favorites` - Get favorite locations
- `POST /api/favorites/:locationId` - Add to favorites
- `DELETE /api/favorites/:locationId` - Remove from favorites
- `GET /api/favorites/check/:locationId` - Check if favorited

### History
- `GET /api/history` - Get comprehensive history
- `GET /api/history/parking` - Get parking history
- `GET /api/history/payments` - Get payment history
- `GET /api/history/stats` - Get history statistics

## Database Schema

### Users Table
- User authentication and profile information
- Balance tracking
- Email verification status

### Vehicles Table
- User vehicle information
- Vehicle types: car, motorcycle, bicycle, ebike
- Default vehicle designation

### Parking Locations Table
- Parking facility information
- Real-time availability
- Pricing and operating hours

### Parking Sessions Table
- Active and completed parking sessions
- QR code generation and tracking
- Cost calculation

### Payments Table
- Payment history and transactions
- Top-up and parking fee payments
- Gateway integration support

### Favorites Table
- User's favorite parking locations

### Notifications Table
- User notifications and alerts

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": { ... },
  "errors": [ ... ] // Only present on validation errors
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Configurable via environment variables

## Security Features

- Password hashing with bcryptjs
- JWT token expiration
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Rate limiting

## Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Database Migration
```bash
npm run migrate
```

### Seeding Data
```bash
npm run seed
```

## Sample Data

After running the seed script, you can use these test accounts:

- **Email**: john.doe@example.com | **Password**: password123
- **Email**: jane.smith@example.com | **Password**: password123
- **Email**: admin@tapparkuser.com | **Password**: password123

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_NAME` | Database name | tapparkuser |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration | 7d |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
