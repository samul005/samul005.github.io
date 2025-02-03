class DatabaseBackup {
    constructor() {
        this.timestamp = "2025-02-02 04:49:10";
        this.currentUser = "samul005";
        this.db = firebase.firestore();
        this.storage = firebase.storage();
    }

    async createBackup() {
        try {
            const collections = [
                'users',
                'games',
                'leaderboards',
                'transactions',
                'activity_logs'
            ];

            const backup = {};
            
            for (const collection of collections) {
                const snapshot = await this.db.collection(collection).get();
                backup[collection] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    data: doc.data()
                }));
            }

            // Create backup file
            const backupJson = JSON.stringify(backup, null, 2);
            const backupBlob = new Blob([backupJson], { type: 'application/json' });
            
            // Upload to storage
            const backupRef = this.storage.ref()
                .child('backups')
                .child(`backup_${this.timestamp}.json`);
            
            await backupRef.put(backupBlob);

            // Log backup
            await this.logBackup(backupRef.fullPath);

            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    async logBackup(backupPath) {
        await this.db.collection('backup_logs').add({
            path: backupPath,
            timestamp: this.timestamp,
            createdBy: this.currentUser,
            status: 'completed'
        });
    }

    async restoreFromBackup(backupPath) {
        try {
            // Get backup file
            const backupRef = this.storage.ref().child(backupPath);
            const backupBlob = await backupRef.download();
            const backupJson = await backupBlob.text();
            const backup = JSON.parse(backupJson);

            // Start batch operations
            const batches = [];
            let currentBatch = this.db.batch();
            let operationCount = 0;

            for (const [collection, documents] of Object.entries(backup)) {
                for (const doc of documents) {
                    const ref = this.db.collection(collection).doc(doc.id);
                    currentBatch.set(ref, doc.data);
                    operationCount++;

                    // Firebase has a limit of 500 operations per batch
                    if (operationCount >= 499) {
                        batches.push(currentBatch);
                        currentBatch = this.db.batch();
                        operationCount = 0;
                    }
                }
            }

            // Add the last batch if it has operations
            if (operationCount > 0) {
                batches.push(currentBatch);
            }

            // Commit all batches
            await Promise.all(batches.map(batch => batch.commit()));

            // Log restoration
            await this.logRestoration(backupPath);

            return true;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            throw error;
        }
    }

    async logRestoration(backupPath) {
        await this.db.collection('restoration_logs').add({
            backupPath: backupPath,
            timestamp: this.timestamp,
            restoredBy: this.currentUser,
            status: 'completed'
        });
    }

    async listBackups() {
        try {
            const backupsRef = this.storage.ref().child('backups');
            const backups = await backupsRef.listAll();
            
            const backupList = await Promise.all(
                backups.items.map(async (item) => {
                    const metadata = await item.getMetadata();
                    return {
                        path: item.fullPath,
                        created: metadata.timeCreated,
                        size: metadata.size,
                        contentType: metadata.contentType
                    };
                })
            );

            return backupList.sort((a, b) => 
                new Date(b.created) - new Date(a.created));
        } catch (error) {
            console.error('Error listing backups:', error);
            throw error;
        }
    }
}

export { DatabaseBackup };
