require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test DB Connection
        await pool.query('SELECT NOW()');
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
};

startServer();
