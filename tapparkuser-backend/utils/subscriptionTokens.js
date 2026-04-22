const db = require('../config/database');

const SUBSCRIBER_USER_TYPE_ID = 1;

const parseBalance = (raw) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const getActiveSubscriptionTokenBalance = async (userId) => {
  if (!userId) return 0;

  const rows = await db.query(
    `SELECT COALESCE(SUM(tokens_remaining), 0) AS total_tokens_remaining
     FROM subscriptions
     WHERE user_id = ? AND status = 'active'`,
    [userId]
  );

  return parseBalance(rows?.[0]?.total_tokens_remaining);
};

const syncUserTokensFromSubscriptions = async (userId) => {
  if (!userId) return 0;
  const totalTokens = await getActiveSubscriptionTokenBalance(userId);
  await db.query('UPDATE users SET tokens = ? WHERE user_id = ?', [totalTokens, userId]);
  return totalTokens;
};

const resolveEffectiveUserTokens = async (user) => {
  if (!user?.user_id) return 0;

  const userTypeId = Number(user.user_type_id);
  if (userTypeId !== SUBSCRIBER_USER_TYPE_ID) {
    return parseBalance(user.tokens);
  }

  return syncUserTokensFromSubscriptions(user.user_id);
};

module.exports = {
  SUBSCRIBER_USER_TYPE_ID,
  getActiveSubscriptionTokenBalance,
  syncUserTokensFromSubscriptions,
  resolveEffectiveUserTokens
};
