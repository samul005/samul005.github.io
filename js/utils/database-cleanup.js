class DatabaseCleanup {
    constructor() {
        this.timestamp = "2025-02-02 05:27:16";
        this.currentUser = "samul005";
        this.db = firebase.firestore();

        this.cleanupConfig = {
            retentionPeriods: {
                logs: 30, // days
                tempData: 7, // days
                deletedUsers: 90, // days
                archivedGames: 365 // days
            },
            batchSize: 500
        };
    }

    async runCleanup() {
        try {
            // Clean up old logs
            await this.cleanupLogs();

            // Clean up temporary data
            await this.cleanupTempData();

            // Clean up deleted users
            await this.cleanupDeletedUsers();

            // Clean up archived games
            await this.cleanupArchivedGames();

            // Log cleanup success
            await this.logCleanupSuccess();

        } catch (error) {
            await this.logCleanupError(error);
            throw error;
        }
    }

    async cleanupLogs() {
        const cutoffDate = new Date();
        cutoffDate.setDate(
            cutoffDate.getDate() - this.cleanupConfig.retentionPeriods.logs
        );

        await this.deleteOldDocuments('logs', cutoffDate);
    }

    async cleanupTempData() {
        const cutoffDate = new Date();
        cutoffDate.setDate(
            cutoffDate.getDate() - this.cleanupConfig.retentionPeriods.tempData
        );

        await this.deleteOldDocuments('temp_data', cutoffDate);
    }

    async cleanupDeletedUsers() {
        const cutoffDate = new Date();
        cutoffDate.setDate(
            cutoffDate.getDate() - this.cleanupConfig.retentionPeriods.deletedUsers
        );

        await this.deleteOldDocuments('deleted_users', cutoffDate);
    }

    async cleanupArchivedGames() {
        const cutoffDate = new Date();
        cutoffDate.setDate(
            cutoffDate.getDate() - this.cleanupConfig.retentionPeriods.archivedGames
        );

        await this.deleteOldDocuments('archived_games', cutoffDate);
    }

    async deleteOldDocuments(collection, cutoffDate) {
        const query = this.db.collection(collection)
            .where('timestamp', '<', cutoffDate.toISOString());

        await this.deleteQueryBatch(query);
    }

    async deleteQueryBatch(query) {
        const snapshot = await query
            .limit(this.cleanupConfig.batchSize)
            .get();

        if (snapshot.empty) {
            return;
        }

        const batch = this.db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // If there might be more documents, recursively delete
        if (snapshot.size === this.cleanupConfig.batchSize) {
            await this.deleteQueryBatch(query);
        }
    }

    async logCleanupSuccess() {
        await this.db.collection('cleanup_logs').add({
            status: 'success',
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }

    async logCleanupError(error) {
        await this.db.collection('cleanup_logs').add({
            status: 'error',
            error: {
                message: error.message,
                stack: error.stack
            },
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }
}

export { DatabaseCleanup };
