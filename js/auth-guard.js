class AuthGuard {
    constructor() {
        this.timestamp = "2025-02-02 04:46:06";
        this.currentUser = "samul005";
        this.auth = window.auth;
        
        this.protectedRoutes = [
            'game.html',
            'profile.html',
            'store.html',
            'settings.html'
        ];

        this.adminRoutes = [
            'admin/index.html',
            'admin/users.html',
            'admin/reports.html'
        ];

        this.setupAuthStateListener();
    }

    setupAuthStateListener() {
        this.auth.onAuthStateChanged((user) => {
            this.handleAuthStateChange(user);
        });
    }

    async handleAuthStateChange(user) {
        const currentPage = window.location.pathname.split('/').pop();

        if (user) {
            // User is signed in
            const userData = await this.getUserData(user.uid);
            
            // Check if user needs to complete profile
            if (!userData.profileComplete && currentPage !== 'onboarding.html') {
                this.redirectTo('onboarding.html');
                return;
            }

            // Check admin routes
            if (this.adminRoutes.includes(currentPage)) {
                if (!userData.isAdmin) {
                    this.redirectTo('index.html');
                    return;
                }
            }

            // Update last active timestamp
            await this.updateLastActive(user.uid);
        } else {
            // User is signed out
            if (this.protectedRoutes.includes(currentPage)) {
                this.redirectTo('login.html');
            }
        }
    }

    async getUserData(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            const userData = await response.json();
            return userData;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return {};
        }
    }

    async updateLastActive(userId) {
        try {
            await fetch(`/api/users/${userId}/last-active`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timestamp: this.timestamp
                })
            });
        } catch (error) {
            console.error('Error updating last active:', error);
        }
    }

    redirectTo(page) {
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `${page}?returnUrl=${currentUrl}`;
    }

    static checkAuth() {
        return new Promise((resolve) => {
            const auth = window.auth;
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    static async requireAuth(callback) {
        const user = await AuthGuard.checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        callback(user);
    }

    static async requireAdmin(callback) {
        const user = await AuthGuard.checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch(`/api/users/${user.uid}`);
            const userData = await response.json();
            
            if (!userData.isAdmin) {
                window.location.href = 'index.html';
                return;
            }
            
            callback(user, userData);
        } catch (error) {
            console.error('Error checking admin status:', error);
            window.location.href = 'index.html';
        }
    }
}

// Initialize auth guard when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthGuard();
});

// Export static methods for use in other files
export { AuthGuard };
