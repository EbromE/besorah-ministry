/**
 * Calendar Manager for Bible Reading Planner
 * Handles calendar display and interactions
 */

const CalendarManager = {
    currentDate: new Date(),
    calendarType: 'gregorian', // 'gregorian' or 'ethiopian'
    selectedDate: null,

    /**
     * Initialize calendar
     */
    init() {
        this.calendarType = StorageManager.getPreference('calendarType', 'gregorian');
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.setupEventListeners();
        this.render();
        this.updateStats();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Calendar type toggle
        const gregorianBtn = document.getElementById('gregorianBtn');
        const ethiopianBtn = document.getElementById('ethiopianBtn');

        if (gregorianBtn) {
            gregorianBtn.addEventListener('click', () => {
                this.setCalendarType('gregorian');
            });
        }

        if (ethiopianBtn) {
            ethiopianBtn.addEventListener('click', () => {
                this.setCalendarType('ethiopian');
            });
        }

        // Month navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.changeMonth(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.changeMonth(1);
            });
        }

        // Reading plan selector
        const planSelect = document.getElementById('readingPlan');
        if (planSelect) {
            planSelect.addEventListener('change', (e) => {
                ReadingPlansManager.setCurrentPlan(e.target.value);
                this.render();
                this.updateStats();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.confirmReset();
            });
        }

        // Save notes button
        const saveNotesBtn = document.getElementById('saveNotes');
        if (saveNotesBtn) {
            saveNotesBtn.addEventListener('click', () => {
                this.saveNotes();
            });
        }
    },

    /**
     * Set calendar type
     * @param {string} type - 'gregorian' or 'ethiopian'
     */
    setCalendarType(type) {
        this.calendarType = type;
        StorageManager.setPreference('calendarType', type);

        // Update button states
        document.getElementById('gregorianBtn')?.classList.toggle('active', type === 'gregorian');
        document.getElementById('ethiopianBtn')?.classList.toggle('active', type === 'ethiopian');

        this.render();
    },

    /**
     * Change current month
     * @param {number} delta - Month change (-1 or 1)
     */
    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.render();
    },

    /**
     * Render calendar
     */
    render() {
        const calendar = document.getElementById('calendar');
        if (!calendar) return;

        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            calendar.appendChild(header);
        });

        // Get month data
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Update month title
        const monthTitle = document.getElementById('currentMonth');
        if (monthTitle) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            monthTitle.textContent = `${monthNames[month]} ${year}`;
        }

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendar.appendChild(emptyDay);
        }

        // Add days of the month
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.getDateKey(date);
            const dayElement = this.createDayElement(date, dateKey, today);
            calendar.appendChild(dayElement);
        }
    },

    /**
     * Create a day element
     * @param {Date} date - Date object
     * @param {string} dateKey - Date key string
     * @param {Date} today - Today's date
     * @returns {HTMLElement}
     */
    createDayElement(date, dateKey, today) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayDiv.appendChild(dayNumber);

        // Get reading for this date
        const reading = ReadingPlansManager.getReadingForDate(date, this.calendarType);
        
        if (reading) {
            // Add reading preview
            const preview = document.createElement('div');
            preview.className = 'day-reading-preview';
            preview.textContent = this.truncateReading(reading.reading);
            dayDiv.appendChild(preview);

            // Check if completed
            if (StorageManager.isReadingComplete(dateKey, reading.day)) {
                dayDiv.classList.add('completed');
            }

            // Check if has feast day
            if (reading.feast) {
                dayDiv.classList.add('has-feast');
            }
        }

        // Mark today
        if (date.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        // Click handler
        dayDiv.addEventListener('click', () => {
            this.selectDate(date);
        });

        return dayDiv;
    },

    /**
     * Truncate reading text for preview
     * @param {string} text - Reading text
     * @returns {string}
     */
    truncateReading(text) {
        if (text.length > 15) {
            return text.substring(0, 12) + '...';
        }
        return text;
    },

    /**
     * Select a date
     * @param {Date} date - Selected date
     */
    selectDate(date) {
        this.selectedDate = date;
        this.displayReading(date);
        this.loadNotes(date);
    },

    /**
     * Display reading for selected date
     * @param {Date} date - Selected date
     */
    displayReading(date) {
        const container = document.getElementById('todayReading');
        if (!container) return;

        const reading = ReadingPlansManager.getReadingForDate(date, this.calendarType);
        const dateKey = this.getDateKey(date);

        if (!reading) {
            container.innerHTML = '<p class="reading-placeholder">No reading assigned for this date.</p>';
            return;
        }

        const isComplete = StorageManager.isReadingComplete(dateKey, reading.day);

        container.innerHTML = `
            <div class="reading-header">
                <div class="reading-date">
                    ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    ${reading.ethiopianDate ? `<br><small>${reading.ethiopianDate}</small>` : ''}
                </div>
                <button class="reading-complete-btn ${isComplete ? 'completed' : ''}" id="completeBtn">
                    ${isComplete ? '✓ Completed' : 'Mark Complete'}
                </button>
            </div>
            <div class="reading-content">
                <div class="reading-passage">${reading.reading}</div>
                ${reading.theme ? `<span class="reading-theme">${reading.theme}</span>` : ''}
                ${reading.chapters ? `<p><small>${reading.chapters} chapter${reading.chapters > 1 ? 's' : ''}</small></p>` : ''}
                ${reading.feast ? `
                    <div class="reading-feast">
                        <span class="reading-feast-icon">✨</span>
                        <span class="reading-feast-text">${reading.feast}</span>
                    </div>
                ` : ''}
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${this.getProgressForDay(reading.day)}%">
                    ${this.getProgressForDay(reading.day)}%
                </div>
            </div>
        `;

        // Add complete button handler
        const completeBtn = document.getElementById('completeBtn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                this.toggleReadingComplete(dateKey, reading.day);
            });
        }
    },

    /**
     * Get progress percentage for a specific day
     * @param {number} day - Day number
     * @returns {number} Progress percentage
     */
    getProgressForDay(day) {
        const totalDays = ReadingPlansManager.getTotalDays();
        return Math.round((day / totalDays) * 100);
    },

    /**
     * Toggle reading completion
     * @param {string} dateKey - Date key
     * @param {number} day - Day number
     */
    toggleReadingComplete(dateKey, day) {
        const isComplete = StorageManager.isReadingComplete(dateKey, day);
        
        if (isComplete) {
            StorageManager.markReadingIncomplete(dateKey, day);
        } else {
            StorageManager.markReadingComplete(dateKey, day);
        }

        this.render();
        this.displayReading(this.selectedDate);
        this.updateStats();
    },

    /**
     * Load notes for selected date
     * @param {Date} date - Selected date
     */
    loadNotes(date) {
        const dateKey = this.getDateKey(date);
        const notes = StorageManager.getStudyNotes(dateKey);
        const textarea = document.getElementById('studyNotes');
        
        if (textarea) {
            textarea.value = notes;
        }
    },

    /**
     * Save notes for current selected date
     */
    saveNotes() {
        if (!this.selectedDate) return;

        const dateKey = this.getDateKey(this.selectedDate);
        const textarea = document.getElementById('studyNotes');
        
        if (textarea) {
            StorageManager.saveStudyNotes(dateKey, textarea.value);
            this.showNotification('Notes saved successfully!');
        }
    },

    /**
     * Update statistics display
     */
    updateStats() {
        const totalDays = ReadingPlansManager.getTotalDays();
        const stats = StorageManager.getStatistics(totalDays);

        const totalEl = document.getElementById('totalReading');
        const completedEl = document.getElementById('completedReading');
        const progressEl = document.getElementById('progressPercent');
        const streakEl = document.getElementById('streakDays');

        if (totalEl) totalEl.textContent = stats.totalReadings;
        if (completedEl) completedEl.textContent = stats.completedReadings;
        if (progressEl) progressEl.textContent = stats.progressPercent + '%';
        if (streakEl) streakEl.textContent = stats.currentStreak;
    },

    /**
     * Get date key string
     * @param {Date} date - Date object
     * @returns {string} Date key (YYYY-MM-DD)
     */
    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Confirm reset action
     */
    confirmReset() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            StorageManager.clearAll();
            this.render();
            this.updateStats();
            this.showNotification('Progress reset successfully!');
        }
    },

    /**
     * Show notification
     * @param {string} message - Notification message
     */
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--success-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
};

/**
 * Initialize planner when DOM is ready
 */
async function initializePlanner() {
    // Initialize all managers
    StorageManager.init();
    await ReadingPlansManager.init();
    CalendarManager.init();

    // Set initial selected date to today
    CalendarManager.selectDate(new Date());
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.CalendarManager = CalendarManager;
    window.initializePlanner = initializePlanner;
}