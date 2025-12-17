/**
 * Storage Management for Bible Reading Planner
 * Handles localStorage operations for reading progress, notes, and preferences
 */

const StorageManager = {
    // Storage keys
    KEYS: {
        COMPLETED_READINGS: 'besorah_completed_readings',
        STUDY_NOTES: 'besorah_study_notes',
        PREFERENCES: 'besorah_preferences',
        CURRENT_PLAN: 'besorah_current_plan',
        STREAK_DATA: 'besorah_streak_data',
        LAST_ACTIVE: 'besorah_last_active'
    },

    /**
     * Initialize storage with default values if not exists
     */
    init() {
        if (!this.get(this.KEYS.COMPLETED_READINGS)) {
            this.set(this.KEYS.COMPLETED_READINGS, []);
        }
        if (!this.get(this.KEYS.STUDY_NOTES)) {
            this.set(this.KEYS.STUDY_NOTES, {});
        }
        if (!this.get(this.KEYS.PREFERENCES)) {
            this.set(this.KEYS.PREFERENCES, {
                calendarType: 'gregorian',
                readingPlan: 'nt90'
            });
        }
        if (!this.get(this.KEYS.STREAK_DATA)) {
            this.set(this.KEYS.STREAK_DATA, {
                currentStreak: 0,
                longestStreak: 0,
                lastCompletedDate: null
            });
        }
        this.updateLastActive();
    },

    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @returns {any} Parsed value or null
     */
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    },

    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
        }
    },

    /**
     * Clear all app data
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            this.remove(key);
        });
        this.init();
    },

    /**
     * Mark a reading as completed
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {number} day - Day number in the reading plan
     */
    markReadingComplete(dateKey, day) {
        const completed = this.get(this.KEYS.COMPLETED_READINGS) || [];
        const entry = { dateKey, day, completedAt: new Date().toISOString() };
        
        // Check if already completed
        const exists = completed.find(c => c.dateKey === dateKey && c.day === day);
        if (!exists) {
            completed.push(entry);
            this.set(this.KEYS.COMPLETED_READINGS, completed);
            this.updateStreak(dateKey);
        }
    },

    /**
     * Mark a reading as incomplete
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {number} day - Day number in the reading plan
     */
    markReadingIncomplete(dateKey, day) {
        let completed = this.get(this.KEYS.COMPLETED_READINGS) || [];
        completed = completed.filter(c => !(c.dateKey === dateKey && c.day === day));
        this.set(this.KEYS.COMPLETED_READINGS, completed);
        this.recalculateStreak();
    },

    /**
     * Check if a reading is completed
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {number} day - Day number in the reading plan
     * @returns {boolean}
     */
    isReadingComplete(dateKey, day) {
        const completed = this.get(this.KEYS.COMPLETED_READINGS) || [];
        return completed.some(c => c.dateKey === dateKey && c.day === day);
    },

    /**
     * Get all completed readings
     * @returns {Array} Array of completed reading objects
     */
    getCompletedReadings() {
        return this.get(this.KEYS.COMPLETED_READINGS) || [];
    },

    /**
     * Save study notes for a specific date
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {string} notes - Study notes text
     */
    saveStudyNotes(dateKey, notes) {
        const allNotes = this.get(this.KEYS.STUDY_NOTES) || {};
        allNotes[dateKey] = {
            content: notes,
            lastModified: new Date().toISOString()
        };
        this.set(this.KEYS.STUDY_NOTES, allNotes);
    },

    /**
     * Get study notes for a specific date
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @returns {string} Notes content or empty string
     */
    getStudyNotes(dateKey) {
        const allNotes = this.get(this.KEYS.STUDY_NOTES) || {};
        return allNotes[dateKey] ? allNotes[dateKey].content : '';
    },

    /**
     * Set user preference
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     */
    setPreference(key, value) {
        const prefs = this.get(this.KEYS.PREFERENCES) || {};
        prefs[key] = value;
        this.set(this.KEYS.PREFERENCES, prefs);
    },

    /**
     * Get user preference
     * @param {string} key - Preference key
     * @param {any} defaultValue - Default value if not found
     * @returns {any}
     */
    getPreference(key, defaultValue = null) {
        const prefs = this.get(this.KEYS.PREFERENCES) || {};
        return prefs[key] !== undefined ? prefs[key] : defaultValue;
    },

    /**
     * Update streak data when a reading is completed
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     */
    updateStreak(dateKey) {
        const streakData = this.get(this.KEYS.STREAK_DATA) || {
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedDate: null
        };

        const completedDate = new Date(dateKey);
        const lastDate = streakData.lastCompletedDate ? new Date(streakData.lastCompletedDate) : null;

        if (!lastDate) {
            // First completion
            streakData.currentStreak = 1;
            streakData.longestStreak = 1;
        } else {
            const dayDiff = Math.floor((completedDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 0) {
                // Same day, no change
                return;
            } else if (dayDiff === 1) {
                // Consecutive day
                streakData.currentStreak++;
            } else {
                // Streak broken
                streakData.currentStreak = 1;
            }
        }

        // Update longest streak
        if (streakData.currentStreak > streakData.longestStreak) {
            streakData.longestStreak = streakData.currentStreak;
        }

        streakData.lastCompletedDate = dateKey;
        this.set(this.KEYS.STREAK_DATA, streakData);
    },

    /**
     * Recalculate streak from completed readings
     */
    recalculateStreak() {
        const completed = this.get(this.KEYS.COMPLETED_READINGS) || [];
        
        if (completed.length === 0) {
            this.set(this.KEYS.STREAK_DATA, {
                currentStreak: 0,
                longestStreak: 0,
                lastCompletedDate: null
            });
            return;
        }

        // Sort by date
        const sorted = completed
            .map(c => c.dateKey)
            .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
            .sort();

        let currentStreak = 1;
        let longestStreak = 1;
        let tempStreak = 1;

        for (let i = 1; i < sorted.length; i++) {
            const prevDate = new Date(sorted[i - 1]);
            const currDate = new Date(sorted[i]);
            const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                tempStreak++;
            } else {
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                tempStreak = 1;
            }
        }

        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }

        // Check if the streak is current (last completed was today or yesterday)
        const lastDate = new Date(sorted[sorted.length - 1]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysSinceLastReading = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

        currentStreak = daysSinceLastReading <= 1 ? tempStreak : 0;

        this.set(this.KEYS.STREAK_DATA, {
            currentStreak,
            longestStreak,
            lastCompletedDate: sorted[sorted.length - 1]
        });
    },

    /**
     * Get current streak data
     * @returns {Object} Streak data
     */
    getStreakData() {
        return this.get(this.KEYS.STREAK_DATA) || {
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedDate: null
        };
    },

    /**
     * Update last active timestamp
     */
    updateLastActive() {
        this.set(this.KEYS.LAST_ACTIVE, new Date().toISOString());
    },

    /**
     * Get statistics for the reading plan
     * @param {number} totalDays - Total days in the reading plan
     * @returns {Object} Statistics object
     */
    getStatistics(totalDays) {
        const completed = this.get(this.KEYS.COMPLETED_READINGS) || [];
        const uniqueDays = [...new Set(completed.map(c => c.day))].length;
        const streakData = this.getStreakData();

        return {
            totalReadings: totalDays,
            completedReadings: uniqueDays,
            progressPercent: totalDays > 0 ? Math.round((uniqueDays / totalDays) * 100) : 0,
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak
        };
    },

    /**
     * Export all data as JSON
     * @returns {string} JSON string of all data
     */
    exportData() {
        const data = {};
        Object.entries(this.KEYS).forEach(([name, key]) => {
            data[name] = this.get(key);
        });
        return JSON.stringify(data, null, 2);
    },

    /**
     * Import data from JSON
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Success status
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            Object.entries(this.KEYS).forEach(([name, key]) => {
                if (data[name]) {
                    this.set(key, data[name]);
                }
            });
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
};

// Initialize storage on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        StorageManager.init();
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}