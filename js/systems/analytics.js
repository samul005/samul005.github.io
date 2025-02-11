
export class AnalyticsSystem {
    constructor() {
        this.events = [];
        this.batchSize = 10;
        this.syncInterval = 60000; // 1 minute
        this.startSync();
    }

    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            sessionId: this.getSessionId()
        };

        this.events.push(event);
        this.checkSync();
    }

    async syncEvents() {
        if (!this.events.length) return;

        const batch = this.events.splice(0, this.batchSize);
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            });
        } catch (error) {
            console.error('Analytics sync failed:', error);
            // Put events back in queue
            this.events.unshift(...batch);
        }
    }

    startSync() {
        setInterval(() => this.syncEvents(), this.syncInterval);
    }

    checkSync() {
        if (this.events.length >= this.batchSize) {
            this.syncEvents();
        }
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        return this.sessionId;
    }
}