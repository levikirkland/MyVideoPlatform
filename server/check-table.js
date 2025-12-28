require('dotenv').config();
const { pool } = require('./src/config/db');

async function check() {
    try {
        const result = await pool.query(
            "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'membership_status')"
        );
        console.log('membership_status enum values:', result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
