class DatabaseMigrations {
    constructor() {
        this.timestamp = "2025-02-02 04:52:16";
        this.currentUser = "samul005";
        this.db = firebase.firestore();
        
        this.migrations = {
            1: this.addUserStatisticsField,
            2: this.updateGameModes,
            3: this.addAchievementsSystem,
            4: this.restructureUserInventory
        };
    }

    async runMigrations() {
        try {
            // Get current database version
            const versionDoc = await this.db.collection('system')
                .doc('version')
                .get();
            
            const currentVersion = versionDoc.exists ? 
                versionDoc.data().version : 0;
            
            // Get all migrations that need to be run
            const pendingMigrations = Object.entries(this.migrations)
                .filter(([version]) => version > currentVersion)
                .sort(([a], [b]) => a - b);

            // Run migrations in sequence
            for (const [version, migration] of pendingMigrations) {
                console.log(`Running migration ${version}...`);
                
                await this.db.runTransaction(async (transaction) => {
                    await migration.call(this, transaction);
                    
                    // Update version number
                    transaction.set(
                        this.db.collection('system').doc('version'),
                        { 
                            version: parseInt(version),
                            lastMigration: this.timestamp,
                            migratedBy: this.currentUser
                        }
                    );
                });

                // Log successful migration
                await this.logMigration(version);
            }

            return true;
        } catch (error) {
            console.error('Migration error:', error);
            await this.logMigrationError(error);
            throw error;
        }
    }

    async addUserStatisticsField(transaction) {
        const users = await this.db.collection('users').get();
        
        for (const user of users.docs) {
            if (!user.data().statistics) {
                transaction.update(user.ref, {
                    statistics: {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        totalScore: 0,
                        bestScore: 0,
                        timePlayed: 0,
                        createdAt: this.timestamp
                    }
                });
            }
        }
    }

    async updateGameModes(transaction) {
        const games = await this.db.collection('games').get();
        
        for (const game of games.docs) {
            const data = game.data();
            if (data.mode === 'normal') {
                transaction.update(game.ref, {
                    mode: 'classic',
                    updatedAt: this.timestamp
                });
            }
        }
    }

    async addAchievementsSystem(transaction) {
        const users = await this.db.collection('users').get();
        
        for (const user of users.docs) {
            if (!user.data().achievements) {
                transaction.update(user.ref, {
                    achievements: {},
                    achievementsUpdatedAt: this.timestamp
                });
            }
        }
    }

    async restructureUserInventory(transaction) {
        const users = await this.db.collection('users').get();
        
        for (const user of users.docs) {
            const data = user.data();
            if (data.inventory && !data.inventory.powerups) {
                const oldInventory = {...data.inventory};
                
                transaction.update(user.ref, {
                    inventory: {
                        powerups: {},
                        themes: {},
                        avatars: {},
                        updatedAt: this.timestamp
                    }
                });

                // Migrate old inventory items to new structure
                for (const [itemId, owned] of Object.entries(oldInventory)) {
                    if (itemId.startsWith('powerup_')) {
                        transaction.update(user.ref, {
                            'inventory.powerups': {
                                [itemId]: owned
                            }
                        });
                    } else if (itemId.startsWith('theme_')) {
                        transaction.update(user.ref, {
                            'inventory.themes': {
                                [itemId]: owned
                            }
                        });
                    } else if (itemId.startsWith('avatar_')) {
                        transaction.update(user.ref, {
                            'inventory.avatars': {
                                [itemId]: owned
                            }
                        });
                    }
                }
            }
        }
    }

    async logMigration(version) {
        await this.db.collection('migration_logs').add({
            version: parseInt(version),
            timestamp: this.timestamp,
            migratedBy: this.currentUser,
            status: 'completed'
        });
    }

    async logMigrationError(error) {
        await this.db.collection('migration_logs').add({
            timestamp: this.timestamp,
            migratedBy: this.currentUser,
            status: 'failed',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }

    async getMigrationHistory() {
        const logs = await this.db.collection('migration_logs')
            .orderBy('timestamp', 'desc')
            .get();
        
        return logs.docs.map(doc => doc.data());
    }

    async rollbackMigration(version) {
        try {
            await this.db.runTransaction(async (transaction) => {
                // Implementation would depend on specific rollback needs
                // This is a placeholder for rollback logic
                console.warn('Migration rollback not implemented');
            });

            await this.logMigrationRollback(version);
            return true;
        } catch (error) {
            console.error('Rollback error:', error);
            await this.logMigrationError(error);
            throw error;
        }
    }

    async logMigrationRollback(version) {
        await this.db.collection('migration_logs').add({
            version: parseInt(version),
            timestamp: this.timestamp,
            migratedBy: this.currentUser,
            status: 'rolledback'
        });
    }
}

export { DatabaseMigrations };
