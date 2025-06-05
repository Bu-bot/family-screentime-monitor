const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('🔄 Starting Family Screen Time Monitor...');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Middleware configured');

// Basic route
app.get('/api/health', (req, res) => {
    console.log('📞 Health check requested');
    res.json({ 
        message: 'Family Screen Time Monitor is alive!', 
        timestamp: new Date().toISOString(),
        status: 'monitoring_your_kids_since_2025' 
    });
});

// Route to get children data
app.get('/api/children', (req, res) => {
    console.log('👶 Children data requested');
    try {
        const { db } = require('./database/init');
        
        db.all('SELECT * FROM children', [], (err, rows) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Children data retrieved:', rows.length, 'records');
            res.json({ children: rows });
        });
    } catch (error) {
        console.error('❌ Server error:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Route to get screen time summary for a child
app.get('/api/child/:id/summary', (req, res) => {
    const childId = req.params.id;
    console.log(`📊 Screen time summary requested for child ${childId}`);
    
    try {
        const { db } = require('./database/init');
        
        // Get today's total screen time
        const today = new Date().toISOString().split('T')[0];
        
        db.get(`
            SELECT 
                SUM(duration_minutes) as today_total,
                COUNT(*) as session_count
            FROM usage_sessions 
            WHERE child_id = ? AND DATE(start_time) = ?
        `, [childId, today], (err, todayData) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Get weekly average
            db.get(`
                SELECT AVG(daily_total) as weekly_avg
                FROM (
                    SELECT DATE(start_time) as date, SUM(duration_minutes) as daily_total
                    FROM usage_sessions 
                    WHERE child_id = ? AND start_time >= datetime('now', '-7 days')
                    GROUP BY DATE(start_time)
                )
            `, [childId], (err, weeklyData) => {
                if (err) {
                    console.error('❌ Database error:', err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                // Get most used app today
                db.get(`
                    SELECT app_name, SUM(duration_minutes) as total_time
                    FROM app_usage 
                    WHERE child_id = ? AND usage_date = ?
                    GROUP BY app_name
                    ORDER BY total_time DESC
                    LIMIT 1
                `, [childId, today], (err, appData) => {
                    if (err) {
                        console.error('❌ Database error:', err.message);
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    const summary = {
                        today_minutes: todayData?.today_total || 0,
                        weekly_avg_minutes: Math.round(weeklyData?.weekly_avg || 0),
                        most_used_app: appData?.app_name || 'None',
                        session_count: todayData?.session_count || 0
                    };
                    
                    console.log('✅ Summary data retrieved:', summary);
                    res.json(summary);
                });
            });
        });
    } catch (error) {
        console.error('❌ Server error:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Route to get weekly trend data
app.get('/api/child/:id/weekly', (req, res) => {
    const childId = req.params.id;
    console.log(`📈 Weekly trend requested for child ${childId}`);
    
    try {
        const { db } = require('./database/init');
        
        db.all(`
            SELECT 
                DATE(start_time) as date,
                SUM(duration_minutes) as total_minutes
            FROM usage_sessions 
            WHERE child_id = ? AND start_time >= datetime('now', '-7 days')
            GROUP BY DATE(start_time)
            ORDER BY date
        `, [childId], (err, rows) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('✅ Weekly data retrieved:', rows.length, 'days');
            res.json({ weekly_data: rows });
        });
    } catch (error) {
        console.error('❌ Server error:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Route to get app usage breakdown
app.get('/api/child/:id/apps', (req, res) => {
    const childId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    console.log(`📱 App usage requested for child ${childId} on ${date}`);
    
    try {
        const { db } = require('./database/init');
        
        db.all(`
            SELECT 
                app_name,
                category,
                SUM(duration_minutes) as total_minutes
            FROM app_usage 
            WHERE child_id = ? AND usage_date = ?
            GROUP BY app_name, category
            ORDER BY total_minutes DESC
        `, [childId, date], (err, rows) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('✅ App usage data retrieved:', rows.length, 'apps');
            res.json({ app_usage: rows });
        });
    } catch (error) {
        console.error('❌ Server error:', error.message);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Add these TV monitoring endpoints to your server.js file

// Route to import TV viewing data
app.post('/api/tv/import', (req, res) => {
    console.log('📺 TV viewing data received');
    
    try {
        const { db } = require('./database/init');
        const { viewingData, date } = req.body;
        
        if (!viewingData || !Array.isArray(viewingData)) {
            return res.status(400).json({ 
                error: 'Invalid data format. Expected array of viewing sessions.' 
            });
        }
        
        const importDate = date || new Date().toISOString().split('T')[0];
        console.log('📅 Processing TV data for', importDate);
        
        // Create TV viewing table if it doesn't exist
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
        `);
        
        // Clear existing data for the date
        db.run('DELETE FROM tv_sessions WHERE viewing_date = ?', [importDate]);
        
        let totalMinutes = 0;
        let sessionsProcessed = 0;
        
        // Insert new viewing data
        const stmt = db.prepare(`
            INSERT INTO tv_sessions (service, content_title, content_type, duration_minutes, start_time, viewing_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        viewingData.forEach(session => {
            const minutes = parseInt(session.duration_minutes) || 0;
            if (minutes > 0) {
                stmt.run(
                    session.service || 'Unknown',
                    session.title || 'Unknown Content',
                    session.type || 'Unknown',
                    minutes,
                    session.start_time || (importDate + ' 12:00:00'),
                    importDate
                );
                totalMinutes += minutes;
                sessionsProcessed++;
                console.log('📺 Added:', session.service, '-', session.title, '(' + minutes + 'm)');
            }
        });
        
        stmt.finalize();
        
        console.log('✅ TV import complete:', totalMinutes, 'minutes,', sessionsProcessed, 'sessions');
        
        res.json({
            success: true,
            message: 'TV viewing data imported successfully',
            summary: {
                totalMinutes: totalMinutes,
                sessionsProcessed: sessionsProcessed,
                date: importDate
            }
        });
        
    } catch (error) {
        console.error('❌ Error importing TV data:', error);
        res.status(500).json({ 
            error: 'Failed to import TV viewing data',
            details: error.message 
        });
    }
});

// Route to get TV viewing summary
app.get('/api/tv/summary', (req, res) => {
    console.log('📺 TV summary requested');
    
    try {
        const { db } = require('./database/init');
        const today = new Date().toISOString().split('T')[0];
        
        db.get(`
            SELECT 
                SUM(duration_minutes) as today_total,
                COUNT(*) as session_count
            FROM tv_sessions 
            WHERE viewing_date = ?
        `, [today], (err, todayData) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            db.get(`
                SELECT service, SUM(duration_minutes) as total_time
                FROM tv_sessions 
                WHERE viewing_date = ?
                GROUP BY service
                ORDER BY total_time DESC
                LIMIT 1
            `, [today], (err, serviceData) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const summary = {
                    today_minutes: todayData?.today_total || 0,
                    weekly_avg_minutes: 0, // We'll add this later
                    most_used_service: serviceData?.service || 'None',
                    session_count: todayData?.session_count || 0
                };
                
                console.log('✅ TV summary retrieved:', summary);
                res.json(summary);
            });
        });
        
    } catch (error) {
        console.error('❌ Error getting TV summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route to get TV service breakdown
app.get('/api/tv/services', (req, res) => {
    console.log('📺 TV services breakdown requested');
    
    try {
        const { db } = require('./database/init');
        const date = req.query.date || new Date().toISOString().split('T')[0];
        
        db.all(`
            SELECT 
                service,
                SUM(duration_minutes) as total_minutes,
                COUNT(*) as session_count
            FROM tv_sessions 
            WHERE viewing_date = ?
            GROUP BY service
            ORDER BY total_minutes DESC
        `, [date], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            console.log('✅ TV services data retrieved:', rows.length, 'services');
            res.json({ service_usage: rows });
        });
        
    } catch (error) {
        console.error('❌ Error getting TV services data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard will be available at http://localhost:${PORT}`);
    console.log(`👀 Time to start watching... I mean, monitoring!`);
    console.log(`💻 Test the API: http://localhost:${PORT}/api/health`);
});

console.log('🏁 Server setup complete, attempting to start...');