export class DatabaseOperation {
    static async withRetry(operation, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
        throw lastError;
    }
}

export class DatabaseManager {
    constructor() {
        if (!window.firebaseDb) {
            throw new Error('Firebase not initialized');
        }
        this.db = window.firebaseDb;
    }

    async getUserData(userId) {
        return DatabaseOperation.withRetry(async () => {
            const doc = await this.db.collection('users').doc(userId).get();
            if (!doc.exists) {
                throw new Error('User not found');
            }
            return doc.data();
        });
    }

    async updateUserProgress(userId, data) {
        return DatabaseOperation.withRetry(async () => {
            await this.db.collection('users').doc(userId).update({
                coins: firebase.firestore.FieldValue.increment(data.coins),
                score: firebase.firestore.FieldValue.increment(data.score),
                gamesWon: firebase.firestore.FieldValue.increment(data.gamesWon),
                lastUpdated: new Date()
            });
        });
    }

    async purchaseItem(userId, { itemId, price, category }) {
        const userRef = this.db.collection('users').doc(userId);
        
        return DatabaseOperation.withRetry(async () => {
            return this.db.runTransaction(async (transaction) => {
                const user = await transaction.get(userRef);
                const userData = user.data();
                
                if (userData.coins < price) {
                    throw new Error('Not enough coins');
                }

                transaction.update(userRef, {
                    coins: userData.coins - price,
                    [`inventory.${itemId}`]: true,
                    lastUpdated: new Date()
                });
            });
        });
    }

    async getUserBalance(userId) {
        return DatabaseOperation.withRetry(async () => {
            const doc = await this.db.collection('users').doc(userId).get();
            if (!doc.exists) {
                throw new Error('User not found');
            }
            return {
                coins: doc.data().coins || 0,
                username: doc.data().username
            };
        });
    }
}

export class Utils {
    static getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}