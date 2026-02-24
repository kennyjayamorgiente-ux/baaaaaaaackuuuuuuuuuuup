const db = require('../config/database');

const ensurePool = async () => {
  if (!db.connection) {
    await db.connect();
  }
  return db.connection;
};

const getOutstandingPenaltyHours = async (userId) => {
  if (!userId) return 0;
  const rows = await db.query(
    'SELECT COALESCE(SUM(penalty_time), 0) AS total_penalty_hours FROM penalty WHERE user_id = ?',
    [userId]
  );
  const total = rows[0]?.total_penalty_hours;
  return total ? parseFloat(total) : 0;
};

const settlePenaltyWithHours = async (userId, hoursCredited = 0, subscriptionId = null) => {
  if (!userId || !hoursCredited || hoursCredited <= 0) {
    const outstanding = await getOutstandingPenaltyHours(userId);
    return {
      penaltyAppliedHours: 0,
      hoursAfterPenalty: Math.max(0, hoursCredited || 0),
      outstandingPenaltyHours: outstanding
    };
  }

  const pool = await ensurePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [penalties] = await connection.query(
      `SELECT penalty_id, penalty_time 
       FROM penalty 
       WHERE user_id = ? 
       ORDER BY created_at ASC, penalty_id ASC 
       FOR UPDATE`,
      [userId]
    );

    let remainingHours = hoursCredited;
    let applied = 0;

    for (const penalty of penalties) {
      if (remainingHours <= 0) break;

      const penaltyTime = parseFloat(penalty.penalty_time) || 0;
      if (penaltyTime <= 0) {
        await connection.execute('DELETE FROM penalty WHERE penalty_id = ?', [penalty.penalty_id]);
        continue;
      }

      const deduction = Math.min(remainingHours, penaltyTime);
      remainingHours -= deduction;
      applied += deduction;

      const leftover = parseFloat((penaltyTime - deduction).toFixed(4));
      if (leftover <= 0.00001) {
        await connection.execute('DELETE FROM penalty WHERE penalty_id = ?', [penalty.penalty_id]);
      } else {
        await connection.execute(
          'UPDATE penalty SET penalty_time = ? WHERE penalty_id = ?',
          [leftover, penalty.penalty_id]
        );
      }
    }

    if (applied > 0 && subscriptionId) {
      await connection.execute(
        'UPDATE subscriptions SET hours_remaining = GREATEST(0, hours_remaining - ?) WHERE subscription_id = ?',
        [applied, subscriptionId]
      );
    }

    const [remainingRows] = await connection.query(
      'SELECT COALESCE(SUM(penalty_time), 0) AS total_penalty_hours FROM penalty WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    return {
      penaltyAppliedHours: applied,
      hoursAfterPenalty: Math.max(0, hoursCredited - applied),
      outstandingPenaltyHours: parseFloat(remainingRows[0]?.total_penalty_hours || 0)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getOutstandingPenaltyHours,
  settlePenaltyWithHours
};
