// src/database/updateChildren.js
const { db } = require('./init');

const updateChildrenNames = () => {
    console.log('👶 Updating children names to real family members...');
    
    // Update Emma to Mimi
    db.run(`UPDATE children SET name = 'Mimi', age = 12 WHERE id = 1`, (err) => {
        if (err) {
            console.error('❌ Error updating Mimi:', err.message);
        } else {
            console.log('✅ Updated child ID 1: Emma → Mimi (age 12)');
        }
    });
    
    // Update Jake to Nigel
    db.run(`UPDATE children SET name = 'Nigel', age = 9 WHERE id = 2`, (err) => {
        if (err) {
            console.error('❌ Error updating Nigel:', err.message);
        } else {
            console.log('✅ Updated child ID 2: Jake → Nigel (age 9)');
        }
    });
    
    // Clear Nigel's data since he doesn't have a phone yet
    setTimeout(() => {
        db.run(`DELETE FROM usage_sessions WHERE child_id = 2`, (err) => {
            if (err) {
                console.error('❌ Error clearing Nigel usage sessions:', err.message);
            } else {
                console.log('🗑️ Cleared Nigel\'s usage sessions (no phone yet)');
            }
        });
        
        db.run(`DELETE FROM app_usage WHERE child_id = 2`, (err) => {
            if (err) {
                console.error('❌ Error clearing Nigel app usage:', err.message);
            } else {
                console.log('🗑️ Cleared Nigel\'s app usage (no phone yet)');
            }
        });
        
        console.log('✅ Database updated successfully!');
        console.log('📱 Ready to import Mimi\'s real Screen Time data');
        console.log('📵 Nigel shows as "no data" until he gets a phone');
    }, 500);
};

module.exports = { updateChildrenNames };