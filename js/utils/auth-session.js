class AuthSession {
    constructor() {
        this.timestamp = "2025-02-02 05:32:29";
        this.currentUser = "samul005";
        this.db = firebase.firestore();

        this.sessionConfig = {
            maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
            inactivityTimeout: 30 * 60 * 1000, // 30 minutes
            renewThreshold: 5 * 60 * 1000, // 5 minutes
            maxConcurrentSessions: 3
        };

        this.initializeSessionMonitoring();
    }

    async initializeSessionMonitoring() {
        this.setupActivityListeners();
        this.startSessionTimer();
    }

    setupActivityListeners() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => this.handleUserActivity());
        });
    }

    startSessionTimer() {
        setInterval(() => this.checkSession(), 60000); // Check every minute
    }

    async createSession(userId) {
        try {
            // Check concurrent sessions
            await this.checkConcurrentSessions(userId);

            const sessionId = this.generateSessionId();
            const session = {
                userId,
                sessionId,
                startTime: this.timestamp,
                lastActivity: this.timestamp,
                expiresAt: this.calculateExpirationTime(),
                device: this.getDeviceInfo(),
                ip: await this.getClientIP()
            };

            await this.db.collection('sessions').doc(sessionId).set(session);
            localStorage.setItem('sessionId', sessionId);

            await this.logSessionEvent('session_created', session);
            return sessionId;
        } catch (error) {
            await this.logSessionError('create_session', error);
            throw error;
        }
    }

    async validateSession(sessionId) {
        try {
            const session = await this.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (this.isSessionExpired(session)) {
                await this.endSession(sessionId);
                throw new Error('Session expired');
            }

            if (await this.hasSessionBeenRevoked(sessionId)) {
                throw new Error('Session has been revoked');
            }

            return true;
        } catch (error) {
            await this.logSessionError('validate_session', error);
            throw error;
        }
    }

    async renewSession(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            
            if (!session) {
                throw new Error('Session not found');
            }

            const updates = {
                lastActivity: this.timestamp,
                expiresAt: this.calculateExpirationTime()
            };

            await this.db.collection('sessions').doc(sessionId).update(updates);
            await this.logSessionEvent('session_renewed', { sessionId, ...updates });

            return updates;
        } catch (error) {
            await this.logSessionError('renew_session', error);
            throw error;
        }
    }

    async endSession(sessionId) {
        try {
            await this.db.collection('sessions').doc(sessionId).delete();
            localStorage.removeItem('sessionId');
            await this.logSessionEvent('session_ended', { sessionId });
        } catch (error) {
            await this.logSessionError('end_session', error);
            throw error;
        }
    }

    async handleUserActivity() {
        try {
            const sessionId = localStorage.getItem('sessionId');
            if (!sessionId) return;

            const session = await this.getSession(sessionId);
            if (!session) return;

            const timeSinceLastActivity = Date.now() - new Date(session.lastActivity).getTime();
            
            if (timeSinceLastActivity > this.sessionConfig.renewThreshold) {
                await this.renewSession(sessionId);
            }
        } catch (error) {
            console.error('Error handling user activity:', error);
        }
    }

    async checkSession() {
        try {
            const sessionId = localStorage.getItem('sessionId');
            if (!sessionId) return;

            const session = await this.getSession(sessionId);
            if (!session) return;

            if (this.isSessionExpired(session)) {
                await this.endSession(sessionId);
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }

    async checkConcurrentSessions(userId) {
        const sessions = await this.db.collection('sessions')
            .where('userId', '==', userId)
            .get();

        if (sessions.size >= this.sessionConfig.maxConcurrentSessions) {
            // End oldest session
            const oldestSession = sessions.docs
                .map(doc => doc.data())
                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

            await this.endSession(oldestSession.sessionId);
        }
    }

    async hasSessionBeenRevoked(sessionId) {
        const revokedSession = await this.db.collection('revoked_sessions')
            .doc(sessionId)
            .get();

        return revokedSession.exists;
    }

    async revokeSession(sessionId, reason) {
        try {
            // Add to revoked sessions
            await this.db.collection('revoked_sessions').doc(sessionId).set({
                revokedAt: this.timestamp,
                revokedBy: this.currentUser,
                reason
            });

            // End the session
            await this.endSession(sessionId);

            await this.logSessionEvent('session_revoked', {
                sessionId,
                reason
            });
        } catch (error) {
            await this.logSessionError('revoke_session', error);
            throw error;
        }
    }

    // Helper methods
    async getSession(sessionId) {
        const doc = await this.db.collection('sessions')
            .doc(sessionId)
            .get();

        return doc.exists ? doc.data() : null;
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    calculateExpirationTime() {
        return new Date(Date.now() + this.sessionConfig.maxSessionDuration)
            .toISOString();
    }

    isSessionExpired(session) {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const lastActivity = new Date(session.lastActivity);

        return now > expiresAt || 
            (now - lastActivity) > this.sessionConfig.inactivityTimeout;
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`
        };
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    redirectToLogin() {
        window.location.href = '/login';
    }

    async logSessionEvent(type, data) {
        await this.db.collection('session_logs').add({
            type,
            ...data,
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }

    async logSessionError(operation, error) {
        await this.db.collection('session_logs').add({
            type: 'error',
            operation,
            error: {
                message: error.message,
                stack: error.stack
            },
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }
}

export { AuthSession };
