class DatabaseCache {
    constructor() {
        this.timestamp = "2025-02-02 05:22:36";
        this.currentUser = "samul005";
        this.db = firebase.firestore();
        
        // Cache settings
        this.settings = {
            defaultTTL: 5 * 60 * 1000, // 5 minutes
            maxCacheSize: 100 * 1024 * 1024, // 100MB
            cleanupInterval: 60 * 1000 // 1 minute
        };

        // Initialize cache store
        this.cacheStore = new Map();
        this.initializeCache();
    }

    async initializeCache() {
        // Start cleanup interval
        setInterval(() => this.cleanup(), this.settings.cleanupInterval);

        // Load persistent cache from IndexedDB
        await this.loadPersistentCache();
    }

    async get(key) {
        const cached = this.cacheStore.get(key);
        
        if (cached && !this.isExpired(cached)) {
            // Update access time
            cached.lastAccessed = Date.now();
            return cached.data;
        }

        // Remove if expired
        if (cached) {
            this.cacheStore.delete(key);
        }

        return null;
    }

    async set(key, data, ttl = this.settings.defaultTTL) {
        // Check cache size before adding
        if (this.getCurrentCacheSize() > this.settings.maxCacheSize) {
            await this.evictLeastRecentlyUsed();
        }

        this.cacheStore.set(key, {
            data,
            created: Date.now(),
            expires: Date.now() + ttl,
            lastAccessed: Date.now(),
            size: this.calculateSize(data)
        });

        // Persist to IndexedDB
        await this.persistToIndexedDB(key, data, ttl);
    }

    async delete(key) {
        this.cacheStore.delete(key);
        await this.removeFromIndexedDB(key);
    }

    async clear() {
        this.cacheStore.clear();
        await this.clearIndexedDB();
    }

    isExpired(cached) {
        return Date.now() > cached.expires;
    }

    getCurrentCacheSize() {
        let totalSize = 0;
        for (const cached of this.cacheStore.values()) {
            totalSize += cached.size;
        }
        return totalSize;
    }

    calculateSize(data) {
        return new TextEncoder().encode(JSON.stringify(data)).length;
    }

    async evictLeastRecentlyUsed() {
        let oldestAccess = Date.now();
        let oldestKey = null;

        for (const [key, cached] of this.cacheStore.entries()) {
            if (cached.lastAccessed < oldestAccess) {
                oldestAccess = cached.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            await this.delete(oldestKey);
        }
    }

    async cleanup() {
        const now = Date.now();
        const expiredKeys = [];

        for (const [key, cached] of this.cacheStore.entries()) {
            if (now > cached.expires) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            await this.delete(key);
        }

        // Log cleanup
        if (expiredKeys.length > 0) {
            await this.logCleanup(expiredKeys.length);
        }
    }

    async loadPersistentCache() {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            
            const items = await store.getAll();
            
            items.forEach(item => {
                if (!this.isExpired(item)) {
                    this.cacheStore.set(item.key, {
                        data: item.data,
                        created: item.created,
                        expires: item.expires,
                        lastAccessed: Date.now(),
                        size: this.calculateSize(item.data)
                    });
                }
            });
        } catch (error) {
            console.error('Error loading persistent cache:', error);
        }
    }

    async persistToIndexedDB(key, data, ttl) {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            await store.put({
                key,
                data,
                created: Date.now(),
                expires: Date.now() + ttl
            });
        } catch (error) {
            console.error('Error persisting to IndexedDB:', error);
        }
    }

    async removeFromIndexedDB(key) {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            await store.delete(key);
        } catch (error) {
            console.error('Error removing from IndexedDB:', error);
        }
    }

    async clearIndexedDB() {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            await store.clear();
        } catch (error) {
            console.error('Error clearing IndexedDB:', error);
        }
    }

    openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FirestoreCache', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
        });
    }

    async logCleanup(itemsRemoved) {
        await this.db.collection('cache_logs').add({
            type: 'cleanup',
            itemsRemoved,
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }

    // Cache analytics methods
    async getCacheStats() {
        const stats = {
            totalItems: this.cacheStore.size,
            totalSize: this.getCurrentCacheSize(),
            hitRate: await this.calculateHitRate(),
            missRate: await this.calculateMissRate(),
            avgAccessTime: await this.calculateAverageAccessTime()
        };

        await this.logCacheStats(stats);
        return stats;
    }

    async calculateHitRate() {
        const logs = await this.db.collection('cache_logs')
            .where('type', 'in', ['hit', 'miss'])
            .get();

        let hits = 0;
        let total = 0;

        logs.forEach(doc => {
            total++;
            if (doc.data().type === 'hit') hits++;
        });

        return total > 0 ? hits / total : 0;
    }

    async calculateMissRate() {
        return 1 - await this.calculateHitRate();
    }

    async calculateAverageAccessTime() {
        const logs = await this.db.collection('cache_logs')
            .where('type', '==', 'access')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        let totalTime = 0;
        let count = 0;

        logs.forEach(doc => {
            totalTime += doc.data().duration;
            count++;
        });

        return count > 0 ? totalTime / count : 0;
    }

    async logCacheStats(stats) {
        await this.db.collection('cache_logs').add({
            type: 'stats',
            stats,
            timestamp: this.timestamp,
            performedBy: this.currentUser
        });
    }
}

export { DatabaseCache };
