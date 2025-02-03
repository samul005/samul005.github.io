class AuthManager {
    constructor() {
        this.timestamp = "2025-02-02 05:30:11";
        this.currentUser = "samul005";
        this.auth = firebase.auth();
        this.db = firebase.firestore();

        // Authentication settings
        this.settings = {
            maxLoginAttempts: 5,
            lockoutDuration: 15, // minutes
            sessionTimeout: 60, // minutes
            requireMFA: true,
            passwordPolicy: {
                minLength: 12,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                preventCommonPasswords: true
            }
        };

        this.initializeAuthListeners();
    }

    async initializeAuthListeners() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.handleUserSignIn(user);
            } else {
                await this.handleUserSignOut();
            }
        });
    }

    async signUp(email, password, userData) {
        try {
            // Validate password strength
            this.validatePassword(password);

            // Create user account
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                email,
                password
            );

            // Create user profile
            await this.createUserProfile(userCredential.user, userData);

            // Setup MFA if required
            if (this.settings.requireMFA) {
                await this.setupMFA(userCredential.user);
            }

            // Log successful signup
            await this.logAuthEvent('signup_success', userCredential.user.uid);

            return userCredential.user;
        } catch (error) {
            await this.logAuthEvent('signup_error', null, error);
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            // Check for account lockout
            await this.checkAccountLockout(email);

            // Attempt sign in
            const userCredential = await this.auth.signInWithEmailAndPassword(
                email,
                password
            );

            // Reset failed attempts
            await this.resetFailedAttempts(email);

            // Update last login
            await this.updateLastLogin(userCredential.user);

            // Log successful signin
            await this.logAuthEvent('signin_success', userCredential.user.uid);

            return userCredential.user;
        } catch (error) {
            await this.handleFailedSignIn(email, error);
            throw error;
        }
    }

    async signOut() {
        try {
            const userId = this.auth.currentUser?.uid;
            await this.auth.signOut();
            await this.logAuthEvent('signout_success', userId);
        } catch (error) {
            await this.logAuthEvent('signout_error', this.auth.currentUser?.uid, error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            await this.logAuthEvent('password_reset_request', null, { email });
        } catch (error) {
            await this.logAuthEvent('password_reset_error', null, error);
            throw error;
        }
    }

    async updatePassword(currentPassword, newPassword) {
        try {
            const user = this.auth.currentUser;
            
            // Reauthenticate user
            await this.reauthenticate(currentPassword);
            
            // Validate new password
            this.validatePassword(newPassword);
            
            // Update password
            await user.updatePassword(newPassword);
            
            await this.logAuthEvent('password_update_success', user.uid);
        } catch (error) {
            await this.logAuthEvent('password_update_error', this.auth.currentUser?.uid, error);
            throw error;
        }
    }

    async setupMFA(user) {
        try {
            // Generate MFA QR code
            const multiFactorInfo = await user.multiFactor.getSession();
            
            // Save MFA information
            await this.db.collection('users').doc(user.uid).update({
                mfaEnabled: true,
                mfaSetupDate: this.timestamp
            });

            await this.logAuthEvent('mfa_setup_success', user.uid);
            return multiFactorInfo;
        } catch (error) {
            await this.logAuthEvent('mfa_setup_error', user.uid, error);
            throw error;
        }
    }

    async verifyMFA(code) {
        try {
            const user = this.auth.currentUser;
            await user.multiFactor.enroll(code);
            await this.logAuthEvent('mfa_verification_success', user.uid);
        } catch (error) {
            await this.logAuthEvent('mfa_verification_error', this.auth.currentUser?.uid, error);
            throw error;
        }
    }

    // Helper methods
    validatePassword(password) {
        const errors = [];
        const policy = this.settings.passwordPolicy;

        if (password.length < policy.minLength) {
            errors.push(`Password must be at least ${policy.minLength} characters long`);
        }

        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (policy.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (policy.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        if (policy.preventCommonPasswords) {
            // Check against common password list
            if (this.isCommonPassword(password)) {
                errors.push('Password is too common. Please choose a stronger password');
            }
        }

        if (errors.length > 0) {
            throw new Error('Password validation failed: ' + errors.join('; '));
        }
    }

    async createUserProfile(user, userData) {
        await this.db.collection('users').doc(user.uid).set({
            email: user.email,
            created: this.timestamp,
            lastLogin: this.timestamp,
            ...userData,
            settings: {
                mfaEnabled: this.settings.requireMFA,
                sessionTimeout: this.settings.sessionTimeout
            }
        });
    }

    async checkAccountLockout(email) {
        const lockoutDoc = await this.db.collection('account_lockouts')
            .doc(email)
            .get();

        if (lockoutDoc.exists) {
            const lockoutData = lockoutDoc.data();
            const lockoutEnd = new Date(lockoutData.lockoutEnd);

            if (lockoutEnd > new Date()) {
                throw new Error('Account is temporarily locked. Please try again later.');
            }
        }
    }

    async handleFailedSignIn(email, error) {
        const failedAttempts = await this.incrementFailedAttempts(email);

        if (failedAttempts >= this.settings.maxLoginAttempts) {
            await this.lockAccount(email);
        }

        await this.logAuthEvent('signin_error', null, {
            error,
            email,
            failedAttempts
        });
    }

    async incrementFailedAttempts(email) {
        const ref = this.db.collection('failed_attempts').doc(email);
        const doc = await ref.get();

        if (!doc.exists) {
            await ref.set({
                count: 1,
                firstAttempt: this.timestamp
            });
            return 1;
        }

        const data = doc.data();
        const newCount = data.count + 1;
        await ref.update({ count: newCount });
        return newCount;
    }

    async lockAccount(email) {
        const lockoutEnd = new Date();
        lockoutEnd.setMinutes(
            lockoutEnd.getMinutes() + this.settings.lockoutDuration
        );

        await this.db.collection('account_lockouts').doc(email).set({
            lockedAt: this.timestamp,
            lockoutEnd: lockoutEnd.toISOString(),
            reason: 'Too many failed login attempts'
        });

        await this.logAuthEvent('account_lockout', null, { email });
    }

    async resetFailedAttempts(email) {
        await this.db.collection('failed_attempts').doc(email).delete();
        await this.db.collection('account_lockouts').doc(email).delete();
    }

    async updateLastLogin(user) {
        await this.db.collection('users').doc(user.uid).update({
            lastLogin: this.timestamp,
            lastLoginIP: await this.getClientIP()
        });
    }

    async reauthenticate(currentPassword) {
        const user = this.auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);
    }

    async logAuthEvent(type, userId, data = {}) {
        await this.db.collection('auth_logs').add({
            type,
            userId,
            timestamp: this.timestamp,
            ip: await this.getClientIP(),
            userAgent: navigator.userAgent,
            ...data
        });
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

    isCommonPassword(password) {
        // This would typically check against a database of common passwords
        const commonPasswords = [
            'password123',
            'qwerty123',
            '123456789',
            'admin123'
        ];
        return commonPasswords.includes(password.toLowerCase());
    }
}

export { AuthManager };
