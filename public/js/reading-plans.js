/**
 * Reading Plans Manager for Bible Reading Planner
 * Handles loading and managing different reading plans
 */

const ReadingPlansManager = {
    plans: {},
    currentPlan: null,

    /**
     * Initialize and load all reading plans
     */
    async init() {
        await this.loadAllPlans();
        const savedPlan = StorageManager.getPreference('readingPlan', 'nt90');
        this.setCurrentPlan(savedPlan);
    },

    /**
     * Load all reading plans from data files
     */
    async loadAllPlans() {
        try {
            // Load NT90 plan
            const nt90Response = await fetch('/data/reading-plans/nt90.json');
            if (nt90Response.ok) {
                this.plans.nt90 = await nt90Response.json();
            }

            // Load Ethiopian Calendar plan
            const ethiopianResponse = await fetch('/data/reading-plans/ethiopian-calendar.json');
            if (ethiopianResponse.ok) {
                this.plans.ethiopian = await ethiopianResponse.json();
            }

            // Load OT365 plan
            const ot365Response = await fetch('/data/reading-plans/ot365.json');
            if (ot365Response.ok) {
                this.plans.ot365 = await ot365Response.json();
            }
        } catch (error) {
            console.error('Error loading reading plans:', error);
            // Fallback to embedded data if fetch fails
            this.loadFallbackPlans();
        }
    },

    /**
     * Load fallback plans (embedded in code)
     */
    loadFallbackPlans() {
        // Simple fallback NT90 plan
        this.plans.nt90 = {
            title: "90-Day New Testament Challenge",
            description: "Read through the entire New Testament in 90 days",
            totalDays: 90,
            schedule: this.generateSimpleNT90()
        };
    },

    /**
     * Generate a simple NT90 schedule
     */
    generateSimpleNT90() {
        const schedule = [];
        const books = [
            { name: "Matthew", chapters: 28 },
            { name: "Mark", chapters: 16 },
            { name: "Luke", chapters: 24 },
            { name: "John", chapters: 21 },
            { name: "Acts", chapters: 28 },
            { name: "Romans", chapters: 16 },
            { name: "1 Corinthians", chapters: 16 },
            { name: "2 Corinthians", chapters: 13 },
            { name: "Galatians", chapters: 6 },
            { name: "Ephesians", chapters: 6 },
            { name: "Philippians", chapters: 4 },
            { name: "Colossians", chapters: 4 },
            { name: "1 Thessalonians", chapters: 5 },
            { name: "2 Thessalonians", chapters: 3 },
            { name: "1 Timothy", chapters: 6 },
            { name: "2 Timothy", chapters: 4 },
            { name: "Titus", chapters: 3 },
            { name: "Philemon", chapters: 1 },
            { name: "Hebrews", chapters: 13 },
            { name: "James", chapters: 5 },
            { name: "1 Peter", chapters: 5 },
            { name: "2 Peter", chapters: 3 },
            { name: "1 John", chapters: 5 },
            { name: "2 John", chapters: 1 },
            { name: "3 John", chapters: 1 },
            { name: "Jude", chapters: 1 },
            { name: "Revelation", chapters: 22 }
        ];

        let day = 1;
        let currentChapter = 1;
        
        for (const book of books) {
            for (let ch = 1; ch <= book.chapters; ch++) {
                if (!schedule[day - 1]) {
                    schedule.push({
                        day: day,
                        reading: `${book.name} ${ch}`,
                        theme: book.name,
                        chapters: 1
                    });
                } else {
                    schedule[day - 1].reading += `-${ch}`;
                    schedule[day - 1].chapters++;
                }

                if (schedule[day - 1].chapters >= 3) {
                    day++;
                }
            }
            if (schedule[day - 1] && schedule[day - 1].chapters > 0) {
                day++;
            }
        }

        return schedule;
    },

    /**
     * Set the current active reading plan
     * @param {string} planKey - Key of the plan (nt90, ethiopian, ot365)
     */
    setCurrentPlan(planKey) {
        if (this.plans[planKey]) {
            this.currentPlan = planKey;
            StorageManager.setPreference('readingPlan', planKey);
        }
    },

    /**
     * Get the current reading plan
     * @returns {Object} Current plan object
     */
    getCurrentPlan() {
        return this.plans[this.currentPlan];
    },

    /**
     * Get reading for a specific day
     * @param {number} day - Day number
     * @returns {Object|null} Reading object
     */
    getReadingForDay(day) {
        const plan = this.getCurrentPlan();
        if (!plan) return null;

        if (plan.schedule) {
            // Standard schedule format (nt90, ot365)
            return plan.schedule.find(r => r.day === day);
        } else if (plan.months) {
            // Ethiopian calendar format
            return this.getEthiopianReadingForDay(day);
        }

        return null;
    },

    /**
     * Get reading for Ethiopian calendar day
     * @param {number} day - Day number
     * @returns {Object|null} Reading object
     */
    getEthiopianReadingForDay(day) {
        const plan = this.plans.ethiopian;
        if (!plan || !plan.months) return null;

        let currentDay = 1;
        for (const month of plan.months) {
            for (const reading of month.readings) {
                if (currentDay === day) {
                    return {
                        day: currentDay,
                        reading: reading.reading,
                        theme: reading.theme,
                        feast: reading.feast || null,
                        month: month.name,
                        monthDay: reading.day
                    };
                }
                currentDay++;
            }
        }

        return null;
    },

    /**
     * Get reading for a specific date
     * @param {Date} date - Date object
     * @returns {Object|null} Reading object
     */
    getReadingForDate(date, calendarType = 'gregorian') {
        if (calendarType === 'ethiopian') {
            return this.getEthiopianReadingForDate(date);
        }

        // For Gregorian calendar, calculate day based on start date
        const startDate = StorageManager.getPreference('planStartDate');
        if (!startDate) {
            // No start date set, use today as day 1
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            StorageManager.setPreference('planStartDate', today.toISOString());
            
            const dayDiff = Math.floor((date - today) / (1000 * 60 * 60 * 24));
            return this.getReadingForDay(dayDiff + 1);
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
        
        return this.getReadingForDay(dayDiff + 1);
    },

    /**
     * Get Ethiopian calendar reading for a specific Gregorian date
     * @param {Date} date - Gregorian date
     * @returns {Object|null} Reading object
     */
    getEthiopianReadingForDate(date) {
        const plan = this.plans.ethiopian;
        if (!plan || !plan.months) return null;

        // Convert Gregorian to Ethiopian calendar
        const ethiopianDate = this.gregorianToEthiopian(date);
        
        // Find the reading for this Ethiopian date
        const month = plan.months.find(m => m.name === ethiopianDate.monthName);
        if (!month) return null;

        const reading = month.readings.find(r => r.day === ethiopianDate.day);
        if (!reading) return null;

        return {
            day: ethiopianDate.dayOfYear,
            reading: reading.reading,
            theme: reading.theme,
            feast: reading.feast || null,
            month: month.name,
            monthDay: reading.day,
            ethiopianDate: `${ethiopianDate.monthName} ${ethiopianDate.day}, ${ethiopianDate.year}`
        };
    },

    /**
     * Convert Gregorian date to Ethiopian calendar
     * @param {Date} gregorianDate - Gregorian date
     * @returns {Object} Ethiopian date object
     */
    gregorianToEthiopian(gregorianDate) {
        // Ethiopian calendar is approximately 7-8 years behind Gregorian
        // New Year starts September 11 (or 12 in leap year)
        
        const year = gregorianDate.getFullYear();
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const ethiopianNewYear = new Date(year, 8, isLeapYear ? 12 : 11); // Sept 11 or 12
        
        let ethiopianYear;
        let dayOfYear;
        
        if (gregorianDate >= ethiopianNewYear) {
            ethiopianYear = year - 7;
            dayOfYear = Math.floor((gregorianDate - ethiopianNewYear) / (1000 * 60 * 60 * 24)) + 1;
        } else {
            ethiopianYear = year - 8;
            const lastNewYear = new Date(year - 1, 8, isLeapYear ? 12 : 11);
            dayOfYear = Math.floor((gregorianDate - lastNewYear) / (1000 * 60 * 60 * 24)) + 1;
        }

        // Ethiopian months (30 days each, except Pagume with 5-6 days)
        const months = [
            "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
            "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
        ];

        let monthIndex = Math.floor((dayOfYear - 1) / 30);
        let day = ((dayOfYear - 1) % 30) + 1;

        if (monthIndex >= 12) {
            monthIndex = 12; // Pagume
            day = dayOfYear - 360;
        }

        return {
            year: ethiopianYear,
            monthName: months[monthIndex],
            monthIndex: monthIndex + 1,
            day: day,
            dayOfYear: dayOfYear
        };
    },

    /**
     * Get all available reading plans
     * @returns {Array} Array of plan info objects
     */
    getAvailablePlans() {
        return Object.keys(this.plans).map(key => {
            const plan = this.plans[key];
            return {
                key: key,
                title: plan.title,
                description: plan.description,
                totalDays: plan.totalDays || 365
            };
        });
    },

    /**
     * Search readings by keyword
     * @param {string} keyword - Search keyword
     * @returns {Array} Array of matching readings
     */
    searchReadings(keyword) {
        const plan = this.getCurrentPlan();
        if (!plan) return [];

        const results = [];
        const searchLower = keyword.toLowerCase();

        if (plan.schedule) {
            plan.schedule.forEach(reading => {
                if (reading.reading.toLowerCase().includes(searchLower) ||
                    (reading.theme && reading.theme.toLowerCase().includes(searchLower))) {
                    results.push(reading);
                }
            });
        } else if (plan.months) {
            plan.months.forEach(month => {
                month.readings.forEach(reading => {
                    if (reading.reading.toLowerCase().includes(searchLower) ||
                        reading.theme.toLowerCase().includes(searchLower) ||
                        (reading.feast && reading.feast.toLowerCase().includes(searchLower))) {
                        results.push({
                            ...reading,
                            month: month.name
                        });
                    }
                });
            });
        }

        return results;
    },

    /**
     * Get total days in current plan
     * @returns {number} Total days
     */
    getTotalDays() {
        const plan = this.getCurrentPlan();
        if (!plan) return 0;

        if (plan.totalDays) {
            return plan.totalDays;
        } else if (plan.schedule) {
            return plan.schedule.length;
        } else if (plan.months) {
            return plan.months.reduce((total, month) => total + month.readings.length, 0);
        }

        return 0;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        await ReadingPlansManager.init();
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadingPlansManager;
}