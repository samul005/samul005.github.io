import { DatabaseManager } from './utils.js';

class Auth {
    constructor() {
        this.firebaseAuth = firebase.auth();
        this.user = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.firebaseAuth.onAuthStateChanged(user => {
                if (user) {
                    this.user = user;
                    console.log('User is authenticated:', user.uid);
                    resolve();
                } else {
                    console.log('No user is authenticated');
                    reject(new Error('No user is authenticated'));
                }
            }, error => {
                console.error('Authentication error:', error);
                reject(error);
            });
        });
    }

    isAuthenticated() {
        return !!this.user;
    }

    getCurrentUser() {
        return this.user;
    }

    signOut() {
        return this.firebaseAuth.signOut();
    }
}

export const auth = new Auth();

class AuthenticationSystem {
    constructor() {
        this.timestamp = "2025-02-02 04:33:17";
        this.currentUser = "samul005";
        this.dbManager = new DatabaseManager();
        
        // Initialize Firebase Auth
        this.auth = firebase.auth();
        
        // Set persistence to LOCAL
        this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        this.setupAuthListeners();

        this.connectionStatus = {
            online: navigator.onLine,
            lastSync: null
        };
        this.monitorConnection();
    }

    setupAuthListeners() {
        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.handleAuthenticatedUser(user);
            } else {
                this.handleUnauthenticatedUser();
            }
        });

        // Setup login form listener
        document.getElementById('loginForm')?.addEventListener('submit', 
            (e) => this.handleLogin(e));

        // Setup register form listener
        document.getElementById('registerForm')?.addEventListener('submit', 
            (e) => this.handleRegister(e));

        // Setup logout button listener
        document.getElementById('logoutBtn')?.addEventListener('click', 
            () => this.handleLogout());
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(
                email, 
                password
            );
            
            // Log login activity
            await this.logUserActivity(userCredential.user.uid, 'login');
            
            // Redirect to appropriate page
            this.redirectAuthenticatedUser(userCredential.user);
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const username = document.getElementById('registerUsername').value;
        
        try {
            // Check if username is available
            if (!await this.isUsernameAvailable(username)) {
                throw new Error('Username already taken');
            }
            
            // Create user account
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                email, 
                password
            );
            
            // Create user profile
            await this.createUserProfile(userCredential.user, username);
            
            // Log registration
            await this.logUserActivity(userCredential.user.uid, 'register');
            
            // Redirect to onboarding
            window.location.href = 'onboarding.html';
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    async handleLogout() {
        try {
            const userId = this.auth.currentUser?.uid;
            await this.auth.signOut();
            
            if (userId) {
                await this.logUserActivity(userId, 'logout');
            }
            
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async handleAuthenticatedUser(user) {
        // Get user profile data
        const userData = await this.dbManager.getUserData(user.uid);
        
        // Update UI elements
        this.updateAuthUI(true, userData);
        
        // Update last active timestamp
        await this.dbManager.updateUserLastActive(user.uid, this.timestamp);
        
        // Check for required profile completion
        if (!userData.profileComplete) {
            window.location.href = 'onboarding.html';
        }
    }

    handleUnauthenticatedUser() {
        // Update UI elements
        this.updateAuthUI(false);
        
        // Redirect if on protected page
        const protectedPages = ['game.html', 'profile.html', 'store.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }

    async isUsernameAvailable(username) {
        try {
            const exists = await this.dbManager.checkUsernameExists(username);
            return !exists;
        } catch (error) {
            console.error('Username check error:', error);
            return false;
        }
    }

    async createUserProfile(user, username) {
        const userProfile = {
            uid: user.uid,
            email: user.email,
            username: username,
            created: this.timestamp,
            lastActive: this.timestamp,
            profileComplete: false,
            level: 1,
            experience: 0,
            coins: 100, // Starting bonus
            inventory: {},
            settings: {
                sound: true,
                music: true,
                theme: 'light',
                language: 'en'
            },
            statistics: {
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                bestScore: 0,
                timePlayed: 0
            }
        };

        await this.dbManager.createUser(userProfile);
    }

    async logUserActivity(userId, action) {
        const activityLog = {
            userId: userId,
            action: action,
            timestamp: this.timestamp,
            deviceInfo: this.getDeviceInfo()
        };

        await this.dbManager.logActivity(activityLog);
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`
        };
    }

    updateAuthUI(isAuthenticated, userData = null) {
        // Update navigation menu
        const authNav = document.getElementById('authNav');
        if (authNav) {
            authNav.innerHTML = isAuthenticated ? `
                <div class="user-info">
                    <span class="username">${userData.username}</span>
                    <span class="coins">🌀 ${userData.coins}</span>
                </div>
                <button id="logoutBtn" class="auth-btn">Logout</button>
            ` : `
                <a href="login.html" class="auth-btn">Login</a>
                <a href="register.html" class="auth-btn primary">Register</a>
            `;
        }

        // Update protected elements
        document.querySelectorAll('[data-requires-auth]').forEach(element => {
            element.style.display = isAuthenticated ? 'block' : 'none';
        });
    }

    handleAuthError(error) {
        let message;
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'Invalid email address';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled';
                break;
            case 'auth/user-not-found':
                message = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password';
                break;
            case 'auth/email-already-in-use':
                message = 'Email already registered';
                break;
            case 'auth/weak-password':
                message = 'Password should be at least 6 characters';
                break;
            default:
                message = error.message;
        }

        // Show error message
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    redirectAuthenticatedUser(user) {
        // Check if return URL is specified
        const returnUrl = new URLSearchParams(window.location.search)
            .get('returnUrl');
        
        if (returnUrl && this.isValidReturnUrl(returnUrl)) {
            window.location.href = returnUrl;
        } else {
            window.location.href = 'index.html';
        }
    }

    isValidReturnUrl(url) {
        // Validate return URL to prevent open redirect
        const allowedPaths = [
            'index.html',
            'game.html',
            'profile.html',
            'store.html'
        ];
        
        try {
            const parsedUrl = new URL(url, window.location.origin);
            const path = parsedUrl.pathname.split('/').pop();
            
            return allowedPaths.includes(path);
        } catch {
            return false;
        }
    }

    monitorConnection() {
        window.addEventListener('online', () => {
            this.connectionStatus.online = true;
            this.handleReconnect();
        });

        window.addEventListener('offline', () => {
            this.connectionStatus.online = false;
            this.handleDisconnect();
        });
    }

    async handleReconnect() {
        try {
            await this.syncOfflineChanges();
            this.showToast('Connection restored', 'success');
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}

// Initialize authentication system when document is ready
document.addEventListener('DOMContentLoaded', function() { // Changed arrow function to regular
    window.authSystem = new AuthenticationSystem();
});
