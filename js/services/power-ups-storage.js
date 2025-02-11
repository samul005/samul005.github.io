export class PowerUpsStorage {
    constructor() {
        this.storageKey = 'hangman_powerups';
    }

    async savePowerUps(userId, powerUps) {
        try {
            const data = JSON.stringify({
                userId,
                powerUps,
                timestamp: Date.now()
            });
            localStorage.setItem(this.storageKey, data);
            return true;
        } catch (error) {
            console.error('Failed to save power-ups:', error);
            return false;
        }
    }

    async loadPowerUps(userId) {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return null;

            const parsed = JSON.parse(data);
            if (parsed.userId !== userId) return null;

            // Check if data is fresh (less than 1 hour old)
            if (Date.now() - parsed.timestamp > 3600000) {
                localStorage.removeItem(this.storageKey);
                return null;
            }

            return parsed.powerUps;
        } catch (error) {
            console.error('Failed to load power-ups:', error);
            return null;
        }
    }
}
