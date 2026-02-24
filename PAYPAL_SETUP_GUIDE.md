# PayPal Sandbox Integration Setup Guide

## 🎯 Overview
This guide will help you integrate PayPal sandbox payment for subscription plan purchases in your TapPark application.

## 📋 Prerequisites
- PayPal Developer Account
- Node.js installed
- React Native development environment set up

---

## 🔧 Backend Setup

### 1. Install Required Package
Navigate to the backend directory and install axios:
```bash
cd tapparkuser-backend
npm install axios
```

### 2. Create PayPal Sandbox Account
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Login or create a developer account
3. Navigate to **Apps & Credentials**
4. Under **Sandbox**, click **Create App**
5. Give your app a name (e.g., "TapPark Sandbox")
6. Copy the **Client ID** and **Secret**

### 3. Configure Environment Variables
Update your `.env` file in the backend directory:
```env
# PayPal Configuration
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_actual_client_id_here
PAYPAL_CLIENT_SECRET=your_actual_secret_here
BACKEND_URL=http://192.168.1.19:3000
```

**Important:** Replace with your actual PayPal credentials from step 2.

### 4. Run Database Migration
Create the PayPal transactions table:
```bash
cd tapparkuser-backend
node scripts/add-paypal-transactions.js
```

### 5. Restart Backend Server
```bash
npm run fast-dev
```

---

## 📱 Frontend Setup

### 1. Install React Native WebView
Navigate to the frontend directory:
```bash
cd tapparkuser
npx expo install react-native-webview
```

### 2. Update app.json
The WebView package should be automatically configured, but verify your `app.json` includes:
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "react-native-webview"
    ]
  }
}
```

### 3. Add Navigation Link
Add a link to the Subscription Plans screen in your app navigation. For example, in your drawer menu or home screen:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

<TouchableOpacity onPress={() => router.push('/screens/SubscriptionPlansScreen')}>
  <Text>Buy Subscription Plan</Text>
</TouchableOpacity>
```

---

## 🧪 Testing the Integration

### 1. Use PayPal Sandbox Test Accounts
PayPal provides test accounts automatically. To view them:
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Sandbox** > **Accounts**
3. You'll see test buyer and seller accounts
4. Click "View/Edit Account" to get login credentials

### 2. Test the Flow
1. Launch your app
2. Navigate to "Subscription Plans"
3. Select a plan
4. Click "Purchase with PayPal"
5. Login with a sandbox buyer account (from step 1)
6. Complete the payment
7. Verify the subscription was added to your account

### 3. Verify Database
Check the database tables:
```sql
-- View PayPal transactions
SELECT * FROM paypal_transactions ORDER BY created_at DESC;

-- View subscriptions
SELECT * FROM subscriptions WHERE user_id = YOUR_USER_ID;

-- View payments
SELECT * FROM payments WHERE payment_type = 'paypal';
```

---

## 🔄 Payment Flow

1. **User selects a plan** → Frontend displays plan details
2. **User clicks "Purchase with PayPal"** → API creates PayPal order
3. **PayPal WebView opens** → User logs in and approves payment
4. **Payment approved** → API captures the payment
5. **Subscription created** → Hours added to user account
6. **Success message** → User redirected back to app

---

## 🛠️ API Endpoints Created

### Backend Endpoints:
- `POST /api/paypal/create-order` - Create PayPal order
- `POST /api/paypal/capture-order` - Capture payment after approval
- `POST /api/paypal/cancel-order` - Handle cancelled payments
- `GET /api/paypal/transaction/:orderId` - Get transaction details
- `GET /api/subscriptions/plans` - Get available plans

### Frontend API Methods:
- `ApiService.getSubscriptionPlans()` - Fetch plans
- `ApiService.createPayPalOrder(planId)` - Create order
- `ApiService.capturePayPalOrder(orderId)` - Capture payment
- `ApiService.cancelPayPalOrder(orderId)` - Cancel order

---

## 📊 Database Schema

### `paypal_transactions` Table
```sql
CREATE TABLE paypal_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  paypal_order_id VARCHAR(100) NOT NULL UNIQUE,
  capture_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('created', 'approved', 'completed', 'cancelled', 'failed'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
);
```

---

## 🚀 Going Live (Future)

When ready for production:
1. Create a live PayPal app in the developer dashboard
2. Get live credentials
3. Update `.env`:
   ```env
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=live_client_id
   PAYPAL_CLIENT_SECRET=live_secret
   ```

---

## ❓ Troubleshooting

### Issue: "PayPal credentials not configured"
- Verify `.env` file has correct credentials
- Restart the backend server after updating `.env`

### Issue: WebView not loading
- Check internet connection
- Verify `BACKEND_URL` in `.env` matches your server address
- Check backend logs for errors

### Issue: Payment not captured
- Check backend logs for capture errors
- Verify PayPal sandbox account has funds
- Check `paypal_transactions` table for error status

### Issue: Database errors
- Run the migration script: `node scripts/add-paypal-transactions.js`
- Verify database connection in backend logs

---

## 📝 Notes

- **Sandbox Mode**: All transactions are test transactions and use fake money
- **Currency**: Currently set to PHP (Philippine Peso) - can be changed in `config/paypal.js`
- **Security**: Never commit `.env` file with real credentials
- **Logs**: Check backend console for detailed PayPal API logs

---

## 📞 Support Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/api/overview/)
- [PayPal Sandbox Guide](https://developer.paypal.com/docs/api-basics/sandbox/)
- [React Native WebView Docs](https://github.com/react-native-webview/react-native-webview)

---

**Setup Complete! 🎉**

Your PayPal sandbox integration is ready for testing. Navigate to the Subscription Plans screen and try purchasing a plan!
