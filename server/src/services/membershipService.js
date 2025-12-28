const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_PRICE = parseInt(process.env.MEMBERSHIP_PRICE_CENTS || '500', 10);
const DEFAULT_DURATION_DAYS = parseInt(process.env.MEMBERSHIP_DURATION_DAYS || '30', 10);
const DEFAULT_PROVIDER = process.env.MEMBERSHIP_PROVIDER || 'paypal';

const addDays = (date, days) => {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
};

async function getLatestMembership(userId) {
    const result = await pool.query(
        `SELECT * FROM memberships 
         WHERE user_id = $1 
         ORDER BY end_date DESC, created_at DESC 
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
}

async function hasActiveMembership(userId) {
    const membership = await pool.query(
        `SELECT 1 FROM memberships 
         WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
         LIMIT 1`,
        [userId]
    );
    return membership.rows.length > 0;
}

async function createPendingMembership(userId, provider = DEFAULT_PROVIDER, amountCents = DEFAULT_PRICE) {
    const now = new Date();
    const end = addDays(now, DEFAULT_DURATION_DAYS);
    const providerId = `sub_${uuidv4()}`;

    const result = await pool.query(
        `INSERT INTO memberships
            (user_id, start_date, end_date, status, provider, provider_subscription_id, amount_cents)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6)
         RETURNING *`,
        [userId, now.toISOString(), end.toISOString(), provider, providerId, amountCents]
    );

    return { membership: result.rows[0], providerId };
}

async function activateMembership({ providerSubscriptionId, provider, amountCents }) {
    const now = new Date();
    const end = addDays(now, DEFAULT_DURATION_DAYS);

    const result = await pool.query(
        `UPDATE memberships
         SET status = 'active', start_date = $1, end_date = $2,
             provider = COALESCE($4, provider), amount_cents = COALESCE($5, amount_cents),
             updated_at = NOW()
         WHERE provider_subscription_id = $3
         RETURNING *`,
        [now.toISOString(), end.toISOString(), providerSubscriptionId, provider, amountCents]
    );

    if (result.rows.length === 0) {
        throw new Error('Subscription not found for activation');
    }

    return result.rows[0];
}

async function expireMembership(providerSubscriptionId) {
    const result = await pool.query(
        `UPDATE memberships
         SET status = 'expired', end_date = LEAST(end_date, NOW()), updated_at = NOW()
         WHERE provider_subscription_id = $1
         RETURNING *`,
        [providerSubscriptionId]
    );
    return result.rows[0];
}

module.exports = {
    getLatestMembership,
    hasActiveMembership,
    createPendingMembership,
    activateMembership,
    expireMembership,
    DEFAULT_PRICE,
    DEFAULT_DURATION_DAYS,
    DEFAULT_PROVIDER
};
