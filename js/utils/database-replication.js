class DatabaseReplication {
    constructor() {
        this.timestamp = "2025-02-02 05:27:16";
        this.currentUser = "samul005";
        this.db = firebase.firestore();
        
        this.replicationConfig = {
            batchSize: 500,
            retryAttempts: 3,
            retryDelay: 1000, // 1 second
            collections: ['users', 'games', 'leaderboards']
        };
    }

    async startReplication(sourceDb, targetDb) {
        try {
            for (const collection of this.replicationConfig.collections) {
                await this.replicateCollection(collection, sourceDb, targetDb);
            }

            await this.logReplicationSuccess();
        } catch (error) {
            await this.logReplicationError(error);
            throw error;
        }
    }

    async replicateCollection(collection, sourceDb, targetDb) {
        let lastDocumentId = null;
        let hasMoreDocuments = true;

        while (hasMoreDocuments) {
            const batch = await this.fetchBatch(
                collection, 
                sourceDb, 
                lastDocumentId
            );

            if (batch.length < this.replicationConfig.batchSize) {
                hasMoreDocuments = false;
            }

            if (batch.length > 0) {
                await this.writeBatch(collection, batch, targetDb);
                lastDocumentId = batch[batch.length - 1].id;
            }
        }
    }

    async fetchBatch(collection, sourceDb, lastDocumentId) {
        let query = sourceDb.collection(collection)
            .orderBy('__name__')
            .limit(this.replicationConfig.batchSize);

        if (lastDocumentId) {
            const lastDoc = await sourceDb.collection(collection)
                .doc(lastDocumentId)
                .get();
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        return snapshot.docs;
    }

    async writeBatch(collection, documents, targetDb) {
        const batch = targetDb.batch();

        documents.forEach(doc => {
            const ref = targetDb.collection(collection).doc(doc.id);
            batch.set(ref, {
                ...doc.data(),
                replicatedAt: this.timestamp,
                replicatedBy: this.currentUser
            });
        });

        await this.retryOperation(() => batch.commit());
    }

    async retryOperation(operation) {
        let lastError;

        for (let attempt = 1; attempt <= this.replicationConfig.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                await this.delay(this.replicationConfig.retryDelay * attempt);
            }
        }

        throw lastError;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async logReplicationSuccess() {
        await this.db.collection('replication_logs').add({
            status: 'success',
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }

    async logReplicationError(error) {
        await this.db.collection('replication_logs').add({
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

export { DatabaseReplication };
