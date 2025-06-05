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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard will be available at http://localhost:${PORT}`);
    console.log(`👀 Time to start watching... I mean, monitoring!`);
    console.log(`💻 Test the API: http://localhost:${PORT}/api/health`);
});

console.log('🏁 Server setup complete, attempting to start...');