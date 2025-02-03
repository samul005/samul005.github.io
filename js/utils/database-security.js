class DatabaseSecurity {
    constructor() {
        this.timestamp = "2025-02-02 05:22:36";
        this.currentUser = "samul005";
        this.db = firebase.firestore();
        
        this.securityRules = {
            read: {
                public: ['games.leaderboard', 'users.profile'],
                authenticated: ['games.*', 'users.own'],
                admin: ['*']
            },
            write: {
                authenticated: ['games.own', 'users.own'],
                admin: ['*']
            }
        };
    }

    async validateAccess(operation, path, user) {
        try {
            // Check if user has required permissions
            const hasPermission = await this.checkPermission(
                operation,
                path,
                user
            );

            // Log access attempt
            await this.logAccessAttempt(
                operation,
                path,
                user,
                hasPermission
            );

            return hasPermission;
        } catch (error) {
            console.error('Error validating access:', error);
            await this.logSecurityEvent('access_error', {
                operation,
                path,
                user,
                error: error.message
            });
            return false;
        }
    }

    async checkPermission(operation, path, user) {
        // Check public access
        if (this.isPublicPath(operation, path)) {
            return true;
        }

        // Check if user is authenticated
        if (!user) {
            return false;
        }

        // Check admin access
        if (await this.isAdmin(user.uid)) {
            return true;
        }

        // Check specific permissions
        return this.checkSpecificPermissions(operation, path, user);
    }

    isPublicPath(operation, path) {
        return this.securityRules[operation].public?.some(
            pattern => this.matchesPattern(path, pattern)
        );
    }

    async isAdmin(userId) {
        const userDoc = await this.db.collection('users')
            .doc(userId)
            .get();
        
        return userDoc.exists && userDoc.data().role === 'admin';
    }

    checkSpecificPermissions(operation, path, user) {
        // Check authenticated user permissions
        const authenticatedPaths = this.securityRules[operation].authenticated;
        
        return authenticatedPaths?.some(pattern => {
            if (pattern.includes('.own')) {
                // Check if the resource belongs to the user
                return this.isOwnResource(path, user.uid);
            }
            return this.matchesPattern(path, pattern);
        });
    }

    isOwnResource(path, userId) {
        const pathParts = path.split('/');
        return pathParts.includes(userId);
    }

    matchesPattern(path, pattern) {
        const pathParts = path.split('.');
        const patternParts = pattern.split('.');

        if (pathParts.length !== patternParts.length) {
            return false;
        }

        return patternParts.every((part, index) => 
            part === '*' || part === pathParts[index]
        );
    }

    async logAccessAttempt(operation, path, user, allowed) {
        await this.db.collection('security_logs').add({
            type: 'access_attempt',
            operation,
            path,
            userId: user?.uid || 'anonymous',
            allowed,
            timestamp: this.timestamp,
            metadata: {
                userAgent: navigator.userAgent,
                ipAddress: await this.getClientIP()
            }
        });
    }

    async logSecurityEvent(type, data) {
        await this.db.collection('security_logs').add({
            type,
            ...data,
            timestamp: this.timestamp,
            metadata: {
                userAgent: navigator.userAgent,
                ipAddress: await this.getClientIP()
            }
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

    // Security monitoring methods
    async monitorSecurityEvents() {
        return this.db.collection('security_logs')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        this.analyzeSecurityEvent(change.doc.data());
                    }
                });
            });
    }

    async analyzeSecurityEvent(event) {
        // Check for suspicious patterns
        if (this.isSuspiciousEvent(event)) {
            await this.handleSuspiciousActivity(event);
        }

        // Update security metrics
        await this.updateSecurityMetrics(event);
    }

    isSuspiciousEvent(event) {
        // Define suspicious patterns
        const suspiciousPatterns = {
            rapidAccess: {
                threshold: 100, // requests per minute
                timeWindow: 60000 // 1 minute
            },
            failedAttempts: {
                threshold: 5, // consecutive failures
                timeWindow: 300000 // 5 minutes
            },
            unusualPaths: [
                'admin.*',
                'system.*',
                'security.*'
            ]
        };

        return (
            this.checkRapidAccess(event, suspiciousPatterns.rapidAccess) ||
            this.checkFailedAttempts(event, suspiciousPatterns.failedAttempts) ||
            this.checkUnusualPaths(event, suspiciousPatterns.unusualPaths)
        );
    }

    async handleSuspiciousActivity(event) {
        // Log suspicious activity
        await this.logSecurityEvent('suspicious_activity', event);

        // Implement security measures
        await this.implementSecurityMeasures(event);
    }

    async implementSecurityMeasures(event) {
        const measures = {
            rateLimit: this.implementRateLimit,
            blockAccess: this.blockSuspiciousAccess,
            notifyAdmin: this.notifySecurityAdmin
        };

        // Apply appropriate measures based on event type
        switch (event.type) {
            case 'rapid_access':
                await measures.rateLimit(event);
                break;
            case 'failed_attempt':
                await measures.blockAccess(event);
                break;
            case 'unusual_path':
                await measures.notifyAdmin(event);
                break;
        }
    }

    async updateSecurityMetrics(event) {
        const metrics = await this.calculateSecurityMetrics();
        await this.db.collection('security_metrics').add({
            ...metrics,
            timestamp: this.timestamp,
            updatedBy: this.currentUser
        });
    }

    async calculateSecurityMetrics() {
        const timeWindow = 3600000; // 1 hour
        const startTime = new Date(Date.now() - timeWindow).toISOString();

        const logs = await this.db.collection('security_logs')
            .where('timestamp', '>=', startTime)
            .get();

        return {
            totalRequests: logs.size,
            failedAttempts: logs.docs.filter(doc => 
                !doc.data().allowed
            ).length,
            suspiciousEvents: logs.docs.filter(doc => 
                doc.data().type === 'suspicious_activity'
            ).length,
           uniqueUsers: new Set(
                logs.docs.map(doc => doc.data().userId)
            ).size,
            accessPatterns: this.analyzeAccessPatterns(logs.docs)
        };
    }

    analyzeAccessPatterns(logs) {
        const patterns = {};
        
        logs.forEach(doc => {
            const data = doc.data();
            const key = `${data.operation}:${data.path}`;
            
            if (!patterns[key]) {
                patterns[key] = {
                    count: 0,
                    allowed: 0,
                    denied: 0,
                    users: new Set()
                };
            }

            patterns[key].count++;
            patterns[key][data.allowed ? 'allowed' : 'denied']++;
            patterns[key].users.add(data.userId);
        });

        // Convert user Sets to counts
        Object.values(patterns).forEach(pattern => {
            pattern.uniqueUsers = pattern.users.size;
            delete pattern.users;
        });

        return patterns;
    }

    async implementRateLimit(event) {
        const rateLimits = await this.db.collection('rate_limits')
            .doc(event.userId)
            .get();

        const currentLimits = rateLimits.exists ? 
            rateLimits.data() : 
            { count: 0, resetTime: this.timestamp };

        if (currentLimits.count >= 100) { // 100 requests per minute limit
            await this.blockUser(event.userId, 'rate_limit');
        } else {
            await this.db.collection('rate_limits')
                .doc(event.userId)
                .set({
                    count: currentLimits.count + 1,
                    resetTime: this.timestamp,
                    lastUpdated: this.timestamp
                });
        }
    }

    async blockSuspiciousAccess(event) {
        await this.blockUser(event.userId, 'suspicious_activity');
        
        // Log blocking event
        await this.logSecurityEvent('user_blocked', {
            userId: event.userId,
            reason: 'suspicious_activity',
            event: event
        });
    }

    async blockUser(userId, reason) {
        await this.db.collection('blocked_users').doc(userId).set({
            reason,
            blockedAt: this.timestamp,
            blockedBy: this.currentUser,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour block
        });
    }

    async notifySecurityAdmin(event) {
        const notification = {
            type: 'security_alert',
            severity: 'high',
            event: event,
            timestamp: this.timestamp,
            status: 'new'
        };

        await this.db.collection('admin_notifications').add(notification);
    }

    async generateSecurityReport() {
        const report = {
            timestamp: this.timestamp,
            generatedBy: this.currentUser,
            metrics: await this.calculateSecurityMetrics(),
            recentEvents: await this.getRecentSecurityEvents(),
            recommendations: await this.generateSecurityRecommendations()
        };

        await this.db.collection('security_reports').add(report);
        return report;
    }

    async getRecentSecurityEvents(hours = 24) {
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        
        const snapshot = await this.db.collection('security_logs')
            .where('timestamp', '>=', startTime)
            .orderBy('timestamp', 'desc')
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    async generateSecurityRecommendations() {
        const metrics = await this.calculateSecurityMetrics();
        const recommendations = [];

        // Check access patterns
        if (metrics.failedAttempts / metrics.totalRequests > 0.1) {
            recommendations.push({
                type: 'access_control',
                severity: 'high',
                description: 'High rate of failed access attempts detected',
                suggestion: 'Review and strengthen access control policies'
            });
        }

        // Check for suspicious patterns
        if (metrics.suspiciousEvents > 0) {
            recommendations.push({
                type: 'monitoring',
                severity: 'high',
                description: 'Suspicious activity detected',
                suggestion: 'Implement additional monitoring and alerting'
            });
        }

        // Check rate limiting
        if (metrics.totalRequests / metrics.uniqueUsers > 1000) {
            recommendations.push({
                type: 'rate_limiting',
                severity: 'medium',
                description: 'High request rate per user detected',
                suggestion: 'Implement or adjust rate limiting policies'
            });
        }

        return recommendations;
    }

    // Utility methods for rule validation
    validateSecurityRules(rules) {
        const validationErrors = [];

        // Check rule structure
        if (!rules.read || !rules.write) {
            validationErrors.push('Missing required rule sections: read/write');
        }

        // Validate read rules
        if (rules.read) {
            this.validateRuleSection(rules.read, 'read', validationErrors);
        }

        // Validate write rules
        if (rules.write) {
            this.validateRuleSection(rules.write, 'write', validationErrors);
        }

        return {
            isValid: validationErrors.length === 0,
            errors: validationErrors
        };
    }

    validateRuleSection(section, type, errors) {
        const validAccessLevels = ['public', 'authenticated', 'admin'];

        Object.keys(section).forEach(level => {
            if (!validAccessLevels.includes(level)) {
                errors.push(`Invalid access level in ${type} rules: ${level}`);
            }

            if (!Array.isArray(section[level])) {
                errors.push(`Invalid rule format for ${type}.${level}`);
            }

            section[level].forEach(path => {
                if (!this.isValidPath(path)) {
                    errors.push(`Invalid path in ${type}.${level}: ${path}`);
                }
            });
        });
    }

    isValidPath(path) {
        // Path validation rules
        const validPathPattern = /^[a-zA-Z0-9_.*]+(\.[a-zA-Z0-9_.*]+)*$/;
        return validPathPattern.test(path);
    }
}

export { DatabaseSecurity };
