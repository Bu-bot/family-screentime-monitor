// src/database/sampleData.js
const { db } = require('./init');

const addSampleScreenTimeData = () => {
    console.log('📱 Adding sample screen time data...');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Using today's date: ${today}`);
    
    // Sample usage sessions for Emma (using today's date)
    const emmaSessions = [
        { child_id: 1, device_type: 'iPhone', device_name: 'Emma iPhone 15', start_time: `${today} 08:00:00`, end_time: `${today} 10:30:00`, duration_minutes: 150 },
        { child_id: 1, device_type: 'iPhone', device_name: 'Emma iPhone 15', start_time: `${today} 15:00:00`, end_time: `${today} 17:15:00`, duration_minutes: 135 },
        { child_id: 1, device_type: 'Apple Watch', device_name: 'Emma Apple Watch', start_time: `${today} 12:00:00`, end_time: `${today} 12:45:00`, duration_minutes: 45 },
        { child_id: 1, device_type: 'Nintendo Switch', device_name: 'Family Switch', start_time: `${today} 19:00:00`, end_time: `${today} 19:30:00`, duration_minutes: 30 },
        
        // Yesterday's data
        { child_id: 1, device_type: 'iPhone', device_name: 'Emma iPhone 15', start_time: `${yesterday} 09:00:00`, end_time: `${yesterday} 12:00:00`, duration_minutes: 180 },
        { child_id: 1, device_type: 'iPhone', device_name: 'Emma iPhone 15', start_time: `${yesterday} 16:00:00`, end_time: `${yesterday} 18:45:00`, duration_minutes: 165 }
    ];
    
    // Sample usage sessions for Jake (using today's date)
    const jakeSessions = [
        { child_id: 2, device_type: 'iPhone', device_name: 'Jake iPhone 14', start_time: `${today} 07:30:00`, end_time: `${today} 09:00:00`, duration_minutes: 90 },
        { child_id: 2, device_type: 'iPhone', device_name: 'Jake iPhone 14', start_time: `${today} 14:00:00`, end_time: `${today} 15:15:00`, duration_minutes: 75 },
        { child_id: 2, device_type: 'Nintendo Switch', device_name: 'Family Switch', start_time: `${today} 18:00:00`, end_time: `${today} 19:30:00`, duration_minutes: 90 },
        
        // Yesterday's data
        { child_id: 2, device_type: 'iPhone', device_name: 'Jake iPhone 14', start_time: `${yesterday} 08:00:00`, end_time: `${yesterday} 10:30:00`, duration_minutes: 150 },
        { child_id: 2, device_type: 'Nintendo Switch', device_name: 'Family Switch', start_time: `${yesterday} 17:00:00`, end_time: `${yesterday} 18:00:00`, duration_minutes: 60 }
    ];
    
    // Sample app usage for Emma (using today's date)
    const emmaApps = [
        { child_id: 1, app_name: 'YouTube', category: 'Entertainment', duration_minutes: 85, usage_date: today },
        { child_id: 1, app_name: 'TikTok', category: 'Social', duration_minutes: 45, usage_date: today },
        { child_id: 1, app_name: 'Instagram', category: 'Social', duration_minutes: 35, usage_date: today },
        { child_id: 1, app_name: 'Duolingo', category: 'Educational', duration_minutes: 25, usage_date: today },
        { child_id: 1, app_name: 'Spotify', category: 'Music', duration_minutes: 40, usage_date: today },
        { child_id: 1, app_name: 'Messages', category: 'Communication', duration_minutes: 15, usage_date: today }
    ];
    
    // Sample app usage for Jake (using today's date)
    const jakeApps = [
        { child_id: 2, app_name: 'Minecraft', category: 'Games', duration_minutes: 60, usage_date: today },
        { child_id: 2, app_name: 'YouTube Kids', category: 'Entertainment', duration_minutes: 35, usage_date: today },
        { child_id: 2, app_name: 'Khan Academy Kids', category: 'Educational', duration_minutes: 20, usage_date: today },
        { child_id: 2, app_name: 'Pokemon GO', category: 'Games', duration_minutes: 25, usage_date: today },
        { child_id: 2, app_name: 'Scratch Jr', category: 'Educational', duration_minutes: 15, usage_date: today }
    ];
    
    // Clear existing data first (optional - remove this if you want to keep accumulating data)
    db.run('DELETE FROM usage_sessions', (err) => {
        if (err) console.log('Note: Could not clear usage_sessions:', err.message);
    });
    
    db.run('DELETE FROM app_usage', (err) => {
        if (err) console.log('Note: Could not clear app_usage:', err.message);
    });
    
    // Wait a moment for deletions to complete, then insert new data
    setTimeout(() => {
        // Insert usage sessions
        const sessionStmt = db.prepare(`
            INSERT INTO usage_sessions (child_id, device_type, device_name, start_time, end_time, duration_minutes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        [...emmaSessions, ...jakeSessions].forEach(session => {
            sessionStmt.run(session.child_id, session.device_type, session.device_name, 
                           session.start_time, session.end_time, session.duration_minutes);
        });
        sessionStmt.finalize();
        
        // Insert app usage
        const appStmt = db.prepare(`
            INSERT INTO app_usage (child_id, app_name, category, duration_minutes, usage_date, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        
        [...emmaApps, ...jakeApps].forEach(app => {
            appStmt.run(app.child_id, app.app_name, app.category, app.duration_minutes, app.usage_date);
        });
        appStmt.finalize();
        
        console.log('✅ Sample screen time data added successfully!');
        console.log(`📊 Added ${emmaSessions.length + jakeSessions.length} usage sessions`);
        console.log(`📱 Added ${emmaApps.length + jakeApps.length} app usage records`);
        console.log(`📅 Data is set for: ${today}`);
    }, 100);
};

module.exports = { addSampleScreenTimeData };