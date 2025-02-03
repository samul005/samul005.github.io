class DatabaseManager {
    constructor() {
        this.timestamp = "2025-02-02 04:49:10";
        this.currentUser = "samul005";
        
        // Initialize Firebase
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.auth = firebase.auth();

        // Enable offline persistence
        this.db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code == 'unimplemented') {
                    console.warn('The current browser does not support persistence.');
                }
            });
    }

    // User Management
    async createUser(userProfile) {
        try {
            await this.db.collection('users').doc(userProfile.uid).set({
                ...userProfile,
                createdAt: this.timestamp,
                updatedAt: this.timestamp
            });
            return true;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUserData(userId) {
        try {
            const doc = await this.db.collection('users').doc(userId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error;
        }
    }

    async updateUserData(userId, data) {
        try {
            await this.db.collection('users').doc(userId).update({
                ...data,
                updatedAt: this.timestamp
            });
            return true;
        } catch (error) {
            console.error('Error updating user data:', error);
            throw error;
        }
    }

    async updateUserLastActive(userId) {
        try {
            await this.db.collection('users').doc(userId).update({
                lastActive: this.timestamp
            });
            return true;
        } catch (error) {
            console.error('Error updating last active:', error);
            throw error;
        }
    }

    // Game Management
    async saveGameResult(gameData) {
        try {
            const result = await this.db.collection('games').add({
                ...gameData,
                timestamp: this.timestamp,
                userId: this.currentUser
            });

            // Update user statistics
            await this.updateUserStatistics(gameData);

            return result.id;
        } catch (error) {
            console.error('Error saving game result:', error);
            throw error;
        }
    }

    async updateUserStatistics(gameData) {
        const userRef = this.db.collection('users').doc(this.currentUser);
        
        await this.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const userData = userDoc.data();

            const newStats = {
                gamesPlayed: (userData.statistics?.gamesPlayed || 0) + 1,
                gamesWon: (userData.statistics?.gamesWon || 0) + (gameData.won ? 1 : 0),
                totalScore: (userData.statistics?.totalScore || 0) + gameData.score,
                bestScore: Math.max(userData.statistics?.bestScore || 0, gameData.score),
                timePlayed: (userData.statistics?.timePlayed || 0) + gameData.duration
            };

            transaction.update(userRef, {
                'statistics': newStats,
                updatedAt: this.timestamp
            });
        });
    }

    // Store Management
    async purchaseItem(itemId, cost) {
        const userRef = this.db.collection('users').doc(this.currentUser);
        
        try {
            await this.db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const userData = userDoc.data();

                if (userData.coins < cost) {
                    throw new Error('Insufficient coins');
                }

                transaction.update(userRef, {
                    coins: userData.coins - cost,
                    [`inventory.${itemId}`]: true,
                    updatedAt: this.timestamp
                });

                // Log transaction
                await this.logStoreTransaction(itemId, cost);
            });

            return true;
        } catch (error) {
            console.error('Error processing purchase:', error);
            throw error;
        }
    }

    async logStoreTransaction(itemId, cost) {
        await this.db.collection('transactions').add({
            userId: this.currentUser,
            itemId: itemId,
            cost: cost,
            timestamp: this.timestamp
        });
    }

    // Leaderboard Management
    async updateLeaderboard(gameMode, score) {
        try {
            const userData = await this.getUserData(this.currentUser);
            
            await this.db.collection('leaderboards')
                .doc(gameMode)
                .collection('scores')
                .add({
                    userId: this.currentUser,
                    username: userData.username,
                    score: score,
                    timestamp: this.timestamp
                });

            // Clean up old scores
            await this.cleanupLeaderboard(gameMode);
        } catch (error) {
            console.error('Error updating leaderboard:', error);
            throw error;
        }
    }

    async getLeaderboard(gameMode, limit = 100) {
        try {
            const snapshot = await this.db.collection('leaderboards')
                .doc(gameMode)
                .collection('scores')
                .orderBy('score', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            throw error;
        }
    }

    async cleanupLeaderboard(gameMode) {
        try {
            const snapshot = await this.db.collection('leaderboards')
                .doc(gameMode)
                .collection('scores')
                .orderBy('score', 'desc')
                .limit(1000)
                .get();

            const batch = this.db.batch();
            snapshot.docs.slice(100).forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            console.error('Error cleaning up leaderboard:', error);
        }
    }

    // Achievement Management
    async checkAndUpdateAchievements(gameData) {
        try {
            const userRef = this.db.collection('users').doc(this.currentUser);
            const userData = await userRef.get();
            const achievements = userData.data().achievements || {};

            // Check each achievement condition
            const newAchievements = this.checkAchievementConditions(
                gameData, 
                achievements
            );

            if (Object.keys(newAchievements).length > 0) {
                await userRef.update({
                    achievements: {
                        ...achievements,
                        ...newAchievements
                    },
                    updatedAt: this.timestamp
                });

                return newAchievements;
            }

            return null;
        } catch (error) {
            console.error('Error checking achievements:', error);
            throw error;
        }
    }

    // Activity Logging
    async logActivity(activity) {
        try {
            await this.db.collection('activity_logs').add({
                ...activity,
                timestamp: this.timestamp
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Error Logging
    async logError(error) {
        try {
            await this.db.collection('error_logs').add({
                error: {
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                },
                userId: this.currentUser,
                timestamp: this.timestamp,
                userAgent: navigator.userAgent
            });
        } catch (logError) {
            console.error('Error logging error:', logError);
        }
    }

    // Cache Management
    async cacheData(key, data, expirationMinutes = 60) {
        try {
            const expirationTime = new Date();
            expirationTime.setMinutes(
                expirationTime.getMinutes() + expirationMinutes
            );

            await this.db.collection('cache').doc(key).set({
                data: data,
                expiresAt: expirationTime.toISOString(),
                updatedAt: this.timestamp
            });
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    async getCachedData(key) {
        try {
            const doc = await this.db.collection('cache').doc(key).get();
            if (!doc.exists) return null;

            const data = doc.data();
            if (new Date(data.expiresAt) < new Date()) {
                await this.db.collection('cache').doc(key).delete();
                return null;
            }

            return data.data;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }
}

export { DatabaseManager };
