const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in project root
const dbPath = path.join(__dirname, '../../family_screentime.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('📊 Connected to SQLite database');
    }
});

// Create tables
const initDatabase = () => {
    // Children profiles table
    db.run(`
        CREATE TABLE IF NOT EXISTS children (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating children table:', err.message);
            return;
        }
        console.log('✅ Children table created');
        
        // Device usage sessions table
        db.run(`
            CREATE TABLE IF NOT EXISTS usage_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                device_type TEXT NOT NULL,
                device_name TEXT,
                start_time DATETIME,
                end_time DATETIME,
                duration_minutes INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating usage_sessions table:', err.message);
                return;
            }
            console.log('✅ Usage sessions table created');
            
            // App/content usage details table
            db.run(`
                CREATE TABLE IF NOT EXISTS app_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    child_id INTEGER,
                    app_name TEXT NOT NULL,
                    category TEXT,
                    duration_minutes INTEGER,
                    usage_date DATE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES usage_sessions (id),
                    FOREIGN KEY (child_id) REFERENCES children (id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating app_usage table:', err.message);
                    return;
                }
                console.log('✅ App usage table created');
                
                // AI insights table
                db.run(`
                    CREATE TABLE IF NOT EXISTS ai_insights (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        child_id INTEGER,
                        insight_text TEXT NOT NULL,
                        category TEXT,
                        severity_level INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (child_id) REFERENCES children (id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating ai_insights table:', err.message);
                        return;
                    }
                    console.log('✅ AI insights table created');
                    console.log('📁 All database tables initialized successfully!');
                    
                    // Now it's safe to add sample data
                    addSampleData();
                });
            });
        });
    });
};

const addSampleData = () => {
    // Add sample children
    db.run(`INSERT OR IGNORE INTO children (id, name, age) VALUES (1, 'Emma', 12)`, (err) => {
        if (err && !err.message.includes('UNIQUE constraint')) {
            console.log('Error adding Emma:', err.message);
        }
    });
    
    db.run(`INSERT OR IGNORE INTO children (id, name, age) VALUES (2, 'Jake', 9)`, (err) => {
        if (err && !err.message.includes('UNIQUE constraint')) {
            console.log('Error adding Jake:', err.message);
        }
    });

    console.log('👶 Sample children added to database');
};

module.exports = { db, initDatabase };