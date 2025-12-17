/**
 * Main Application Controller for Besorah Yeshua Bible Reading Planner
 * Coordinates all components and handles global app functionality
 */

const BesorahApp = {
    version: '1.0.0',
    isInitialized: false,
    currentPage: null,

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Detect current page
            this.detectCurrentPage();

            // Initialize storage
            StorageManager.init();

            // Load reading plans if on planner page
            if (this.currentPage === 'planner') {
                await ReadingPlansManager.init();
                CalendarManager.init();
                
                // Initialize planner-specific features
                this.initializePlannerPage();
            } else if (this.currentPage === 'home') {
                this.initializeHomePage();
            }

            // Setup global event listeners
            this.setupGlobalListeners();

            // Check for updates
            this.checkForUpdates();

            this.isInitialized = true;
            console.log(`Besorah Yeshua v${this.version} initialized successfully`);
        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    },

    /**
     * Detect which page we're on
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        
        if (path.includes('planner.html') || path.includes('planner')) {
            this.currentPage = 'planner';
        } else if (path.includes('about.html')) {
            this.currentPage = 'about';
        } else if (path.includes('contact.html')) {
            this.currentPage = 'contact';
        } else {
            this.currentPage = 'home';
        }
    },

    /**
     * Initialize home page specific features
     */
    initializeHomePage() {
        // Add smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add animation on scroll
        this.setupScrollAnimations();

        // Track page views
        this.trackPageView('home');
    },

    /**
     * Initialize planner page specific features
     */
    initializePlannerPage() {
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup auto-save for notes
        this.setupAutoSaveNotes();

        // Setup export/import functionality
        this.setupDataManagement();

        // Load user preferences
        this.loadUserPreferences();

        // Track page views
        this.trackPageView('planner');

        // Show welcome message for first-time users
        this.checkFirstTimeUser();
    },

    /**
     * Setup global event listeners
     */
    setupGlobalListeners() {
        // Handle online/offline status
        window.addEventListener('online', () => {
            this.showNotification('You are back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('You are offline. Your data is saved locally.', 'info');
        });

        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentPage === 'planner') {
                // Refresh data when user returns to tab
                if (typeof CalendarManager !== 'undefined') {
                    CalendarManager.updateStats();
                }
            }
        });

        // Handle before unload (warn if unsaved notes)
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Mobile menu toggle (if exists)
        this.setupMobileMenu();
    },

    /**
     * Setup keyboard shortcuts for planner
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + S: Save notes
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (typeof CalendarManager !== 'undefined') {
                    CalendarManager.saveNotes();
                }
            }

            // Left arrow: Previous month
            if (e.key === 'ArrowLeft' && e.altKey) {
                e.preventDefault();
                if (typeof CalendarManager !== 'undefined') {
                    CalendarManager.changeMonth(-1);
                }
            }

            // Right arrow: Next month
            if (e.key === 'ArrowRight' && e.altKey) {
                e.preventDefault();
                if (typeof CalendarManager !== 'undefined') {
                    CalendarManager.changeMonth(1);
                }
            }

            // T: Go to today
            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                if (typeof CalendarManager !== 'undefined') {
                    CalendarManager.selectDate(new Date());
                }
            }
        });
    },

    /**
     * Setup auto-save for notes
     */
    setupAutoSaveNotes() {
        const notesTextarea = document.getElementById('studyNotes');
        if (!notesTextarea) return;

        let autoSaveTimeout;

        notesTextarea.addEventListener('input', () => {
            // Clear previous timeout
            clearTimeout(autoSaveTimeout);

            // Set new timeout for auto-save (3 seconds after user stops typing)
            autoSaveTimeout = setTimeout(() => {
                if (typeof CalendarManager !== 'undefined' && CalendarManager.selectedDate) {
                    CalendarManager.saveNotes();
                    this.showNotification('Notes auto-saved', 'success', 2000);
                }
            }, 3000);
        });
    },

    /**
     * Setup data management (export/import)
     */
    setupDataManagement() {
        // Add export button functionality
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Add import button functionality
        const importBtn = document.getElementById('importDataBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importData();
            });
        }
    },

    /**
     * Export all user data
     */
    exportData() {
        try {
            const data = StorageManager.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `besorah-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export data');
        }
    },

    /**
     * Import user data
     */
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const success = StorageManager.importData(event.target.result);
                    if (success) {
                        this.showNotification('Data imported successfully!', 'success');
                        // Refresh the page to load new data
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        this.showError('Failed to import data. Invalid format.');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    this.showError('Failed to import data');
                }
            };

            reader.readAsText(file);
        });

        input.click();
    },

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        // Load theme preference (if implemented)
        const theme = StorageManager.getPreference('theme', 'light');
        this.applyTheme(theme);

        // Load reading plan
        const plan = StorageManager.getPreference('readingPlan', 'nt90');
        const planSelect = document.getElementById('readingPlan');
        if (planSelect) {
            planSelect.value = plan;
        }

        // Load calendar type
        const calendarType = StorageManager.getPreference('calendarType', 'gregorian');
        if (typeof CalendarManager !== 'undefined') {
            CalendarManager.calendarType = calendarType;
        }
    },

    /**
     * Apply theme
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    },

    /**
     * Check if this is a first-time user
     */
    checkFirstTimeUser() {
        const isFirstTime = !StorageManager.getPreference('hasVisited');
        
        if (isFirstTime) {
            StorageManager.setPreference('hasVisited', true);
            this.showWelcomeModal();
        }
    },

    /**
     * Show welcome modal for first-time users
     */
    showWelcomeModal() {
        const modal = this.createModal({
            title: 'Welcome to Besorah Yeshua! 📖',
            content: `
                <p>Thank you for choosing Besorah Yeshua for your Bible reading journey!</p>
                <p><strong>Quick Start Guide:</strong></p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Select a reading plan from the dropdown</li>
                    <li>Click any day on the calendar to view the reading</li>
                    <li>Mark readings as complete to track your progress</li>
                    <li>Add study notes for personal reflection</li>
                    <li>Your progress is automatically saved</li>
                </ul>
                <p>May God bless your reading journey!</p>
            `,
            buttons: [
                {
                    text: 'Get Started',
                    primary: true,
                    onClick: () => this.closeModal()
                }
            ]
        });

        document.body.appendChild(modal);
    },

    /**
     * Setup scroll animations
     */
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe feature cards and other elements
        document.querySelectorAll('.feature-card, .about-content').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    },

    /**
     * Setup mobile menu toggle
     */
    setupMobileMenu() {
        const menuToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.querySelector('.nav-menu');

        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                }
            });
        }
    },

    /**
     * Check if there are unsaved changes
     * @returns {boolean}
     */
    hasUnsavedChanges() {
        const notesTextarea = document.getElementById('studyNotes');
        if (!notesTextarea) return false;

        if (typeof CalendarManager === 'undefined' || !CalendarManager.selectedDate) {
            return false;
        }

        const dateKey = CalendarManager.getDateKey(CalendarManager.selectedDate);
        const savedNotes = StorageManager.getStudyNotes(dateKey);
        
        return notesTextarea.value !== savedNotes;
    },

    /**
     * Check for updates (placeholder for future functionality)
     */
    async checkForUpdates() {
        // This could check a version endpoint in the future
        const lastVersion = StorageManager.getPreference('appVersion');
        
        if (lastVersion && lastVersion !== this.version) {
            console.log(`Updated from ${lastVersion} to ${this.version}`);
            this.showNotification('App updated to new version!', 'info');
        }

        StorageManager.setPreference('appVersion', this.version);
    },

    /**
     * Track page view (placeholder for analytics)
     * @param {string} pageName - Name of the page
     */
    trackPageView(pageName) {
        // This could integrate with analytics in the future
        console.log(`Page view: ${pageName}`);
        
        // Update visit count
        const visits = StorageManager.getPreference('totalVisits', 0);
        StorageManager.setPreference('totalVisits', visits + 1);
    },

    /**
     * Create a modal dialog
     * @param {Object} options - Modal options
     * @returns {HTMLElement}
     */
    createModal(options) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';

        const modal = document.createElement('div');
        modal.className = 'modal-content';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `<h3>${options.title}</h3>`;
        modal.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = options.content;
        modal.appendChild(body);

        // Actions
        if (options.buttons && options.buttons.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'modal-actions';

            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `btn ${btn.primary ? 'btn-primary' : 'btn-secondary'}`;
                button.textContent = btn.text;
                button.addEventListener('click', () => {
                    if (btn.onClick) btn.onClick();
                    overlay.remove();
                });
                actions.appendChild(button);
            });

            modal.appendChild(actions);
        }

        overlay.appendChild(modal);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        return overlay;
    },

    /**
     * Close active modal
     */
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Type: 'success', 'error', 'info', 'warning'
     * @param {number} duration - Duration in ms (default 3000)
     */
    showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type] || colors.success};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    },

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showNotification(message, 'error', 5000);
    },

    /**
     * Format date for display
     * @param {Date} date - Date object
     * @param {string} format - Format type ('short', 'long', 'iso')
     * @returns {string}
     */
    formatDate(date, format = 'long') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }

        switch (format) {
            case 'short':
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
            case 'long':
                return date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
            case 'iso':
                return date.toISOString().split('T')[0];
            default:
                return date.toLocaleDateString();
        }
    },

    /**
     * Get greeting based on time of day
     * @returns {string}
     */
    getGreeting() {
        const hour = new Date().getHours();
        
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    },

    /**
     * Generate shareable link (future feature)
     * @returns {string}
     */
    generateShareLink() {
        const stats = StorageManager.getStatistics(365);
        return `I've completed ${stats.completedReadings} Bible readings on Besorah Yeshua! 📖 #BibleReading`;
    },

    /**
     * Debug helper - Log current state
     */
    debugInfo() {
        console.group('Besorah Yeshua Debug Info');
        console.log('Version:', this.version);
        console.log('Current Page:', this.currentPage);
        console.log('Initialized:', this.isInitialized);
        console.log('Storage:', {
            completedReadings: StorageManager.getCompletedReadings().length,
            preferences: StorageManager.get(StorageManager.KEYS.PREFERENCES),
            streak: StorageManager.getStreakData()
        });
        if (typeof ReadingPlansManager !== 'undefined') {
            console.log('Current Plan:', ReadingPlansManager.currentPlan);
            console.log('Total Days:', ReadingPlansManager.getTotalDays());
        }
        console.groupEnd();
    }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            BesorahApp.init();
        });
    } else {
        BesorahApp.init();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.BesorahApp = BesorahApp;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BesorahApp;
}