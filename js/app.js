// app.js - Main Application Entry Point

import { AuthManager } from './js/utils/auth-manager.js';
import { AuthRoles } from './js/utils/auth-roles.js';
import { AuthSession } from './js/utils/auth-session.js';
import { DatabaseManager } from './js/utils/database-manager.js';
import { DatabaseQuery } from './js/utils/database-query.js';
import { DatabaseOptimizer } from './js/utils/database-optimizer.js';
import { DatabaseMonitor } from './js/utils/database-monitor.js';
import { DatabaseCache } from './js/utils/database-cache.js';
import { DatabaseSecurity } from './js/utils/database-security.js';
import { Logger } from './js/utils/logger.js';
import { auth } from './auth.js';

// Add default avatar constant at the top of the file
const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dboxc3yay/image/upload/v1738586416/6493175011714470428_jgjnsq.png';

class App {
    constructor() {
        this.timestamp = "2025-02-02 06:17:23";
        this.currentUser = "samul005";
        
        // Application configuration
        this.config = {
            environment: process.env.NODE_ENV || 'development',
            apiVersion: '1.0.0',
            defaultLanguage: 'en',
            supportedLanguages: ['en', 'es', 'fr', 'de', 'ja'],
            maxRequestSize: 10 * 1024 * 1024, // 10MB
            defaultTimeout: 30000, // 30 seconds
            maxRetries: 3
        };

        // Initialize core services
        this.initializeServices();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start application monitoring
        this.startMonitoring();

        // Update user profile
        this.updateUserProfile();

        this.loadingStates = new Map();
        this.errorStates = new Map();
        this.initializeApp();
    }

    async initializeApp() {
        this.setLoading('app', true);
        try {
            await this.dbManager.initialize();
            await this.loadInitialData();
            this.setupAutoRefresh();
        } catch (error) {
            this.setError('app', error);
        } finally {
            this.setLoading('app', false);
        }
    }

    setLoading(key, isLoading) {
        this.loadingStates.set(key, isLoading);
        this.updateLoadingUI();
    }

    setError(key, error) {
        this.errorStates.set(key, error);
        this.updateErrorUI();
    }

    async initializeServices() {
        try {
            // Initialize logger first for proper error tracking
            this.logger = new Logger({
                timestamp: this.timestamp,
                currentUser: this.currentUser
            });

            // Initialize Firebase
            await this.initializeFirebase();

            // Initialize authentication services
            this.authManager = new AuthManager();
            this.authRoles = new AuthRoles();
            this.authSession = new AuthSession();

            // Initialize database services
            this.dbManager = new DatabaseManager();
            this.dbQuery = new DatabaseQuery();
            this.dbOptimizer = new DatabaseOptimizer();
            this.dbMonitor = new DatabaseMonitor();
            this.dbCache = new DatabaseCache();
            this.dbSecurity = new DatabaseSecurity();

            // Log successful initialization
            await this.logger.log('app_init', 'Services initialized successfully');
        } catch (error) {
            await this.logger.error('app_init_error', error);
            throw error;
        }
    }

    async initializeFirebase() {
        const firebaseConfig = {
            // Firebase configuration would be here
            // Typically loaded from environment variables
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };

        try {
            firebase.initializeApp(firebaseConfig);
            await this.logger.log('firebase_init', 'Firebase initialized successfully');
        } catch (error) {
            await this.logger.error('firebase_init_error', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Global error handling
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleGlobalError(error);
        };

        // Unhandled promise rejection handling
        window.onunhandledrejection = (event) => {
            this.handleUnhandledRejection(event);
        };

        // Application state changes
        window.onbeforeunload = () => {
            this.handleBeforeUnload();
        };

        // Network status monitoring
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Service worker registration
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
    }

    async startMonitoring() {
        try {
            // Start performance monitoring
            this.startPerformanceMonitoring();

            // Start error monitoring
            this.startErrorMonitoring();

            // Start usage analytics
            this.startUsageAnalytics();

            await this.logger.log('monitoring_start', 'Application monitoring started');
        } catch (error) {
            await this.logger.error('monitoring_start_error', error);
        }
    }

    async handleGlobalError(error) {
        try {
            await this.logger.error('global_error', {
                error,
                timestamp: this.timestamp,
                user: this.currentUser
            });

            // Show user-friendly error message
            this.showErrorNotification('An unexpected error occurred. Please try again.');
        } catch (loggingError) {
            console.error('Error logging failed:', loggingError);
        }
    }

    async handleUnhandledRejection(event) {
        try {
            await this.logger.error('unhandled_rejection', {
                error: event.reason,
                timestamp: this.timestamp,
                user: this.currentUser
            });
        } catch (loggingError) {
            console.error('Error logging failed:', loggingError);
        }
    }

    async handleBeforeUnload() {
        try {
            // Clean up resources
            await this.cleanup();
            
            // Log session end
            await this.logger.log('session_end', {
                timestamp: this.timestamp,
                user: this.currentUser
            });
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }

    async handleOnline() {
        try {
            await this.logger.log('network_status', {
                status: 'online',
                timestamp: this.timestamp
            });

            // Resync data if needed
            await this.resyncData();
        } catch (error) {
            await this.logger.error('online_handler_error', error);
        }
    }

    async handleOffline() {
        try {
            await this.logger.log('network_status', {
                status: 'offline',
                timestamp: this.timestamp
            });

            // Enable offline mode
            this.enableOfflineMode();
        } catch (error) {
            await this.logger.error('offline_handler_error', error);
        }
    }

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            await this.logger.log('sw_registration', {
                success: true,
                timestamp: this.timestamp
            });
        } catch (error) {
            await this.logger.error('sw_registration_error', error);
        }
    }

    startPerformanceMonitoring() {
        // Monitor performance metrics
        this.performanceMonitor = setInterval(() => {
            const metrics = {
                memory: performance.memory,
                timing: performance.timing,
                navigation: performance.navigation
            };

            this.logger.log('performance_metrics', metrics);
        }, 60000); // Every minute
    }

    startErrorMonitoring() {
        // Monitor error rates and patterns
        this.errorMonitor = setInterval(() => {
            const errorMetrics = this.dbMonitor.getErrorMetrics();
            this.logger.log('error_metrics', errorMetrics);
        }, 300000); // Every 5 minutes
    }

    startUsageAnalytics() {
        // Track application usage patterns
        this.analyticsMonitor = setInterval(() => {
            const usageMetrics = this.collectUsageMetrics();
            this.logger.log('usage_metrics', usageMetrics);
        }, 900000); // Every 15 minutes
    }

    async resyncData() {
        try {
            await this.dbManager.syncOfflineData();
            this.showNotification('Data synchronized successfully');
        } catch (error) {
            await this.logger.error('resync_error', error);
            this.showErrorNotification('Data synchronization failed');
        }
    }

    enableOfflineMode() {
        this.dbCache.enableOfflineMode();
        this.showNotification('Offline mode enabled');
    }

    async cleanup() {
        // Clear intervals
        clearInterval(this.performanceMonitor);
        clearInterval(this.errorMonitor);
        clearInterval(this.analyticsMonitor);

        // Clear caches
        await this.dbCache.clear();

        // Close database connections
        await this.dbManager.closeConnections();
    }

    collectUsageMetrics() {
        return {
            activeUsers: this.authSession.getActiveSessionCount(),
            databaseQueries: this.dbQuery.getQueryMetrics(),
            cacheHitRate: this.dbCache.getHitRate(),
            averageResponseTime: this.dbMonitor.getAverageResponseTime()
        };
    }

    showNotification(message, type = 'info') {
        // Implementation would depend on UI framework
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    showErrorNotification(message) {
        this.showNotification(message, 'error');
    }

    updateProfileHeader(userData) {
        // Update avatar with new default
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.src = userData.avatar || DEFAULT_AVATAR_URL;
        }
        // ...existing code...
    }

    async updateUserProfile() {
        try {
            const userBalance = await this.dbManager.getUserBalance(this.currentUser);
            
            // Update coin amount with animation
            const coinAmount = document.getElementById('coinAmount');
            if (coinAmount) {
                this.animateNumber(
                    parseInt(coinAmount.textContent.replace(/,/g, '')) || 0,
                    userBalance.coins,
                    coinAmount
                );
            }

            // Update username
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.textContent = userBalance.username;
            }

        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    }

    animateNumber(start, end, element) {
        const duration = 1000;
        const steps = 60;
        const increment = (end - start) / steps;
        let current = start;

        const updateNumber = () => {
            current += increment;
            if ((increment > 0 && current >= end) || 
                (increment < 0 && current <= end)) {
                element.textContent = end.toLocaleString();
                return;
            }
            element.textContent = Math.round(current).toLocaleString();
            requestAnimationFrame(updateNumber);
        };

        requestAnimationFrame(updateNumber);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
