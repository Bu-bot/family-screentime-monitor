// src/database/createTVTable.js
const { db } = require('./init');

const createTVTable = () => {
    console.log('📺 Creating TV sessions table...');
    
    db.run(`
        CREATE TABLE IF NOT EXISTS tv_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            content_title TEXT,
            content_type TEXT,
            duration_minutes INTEGER,
            start_time DATETIME,
            viewing_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating TV table:', err.message);
        } else {
            console.log('✅ TV sessions table created successfully');
        }
    });
};

module.exports = { createTVTable };