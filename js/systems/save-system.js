import { DatabaseManager } from '../utils.js';

export class SaveSystem {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.localKey = 'hangman_save';
        this.syncInterval = 30000; // 30 seconds
        this.startSync();
    }

    async saveGame(gameState) {
        try {
            // Save locally
            localStorage.setItem(this.localKey, JSON.stringify({
                state: gameState,
                timestamp: Date.now()
            }));

            // Save to cloud if online
            if (navigator.onLine) {
                await this.dbManager.saveGameState(gameState);
            }

            return true;
        } catch (error) {
            console.error('Save failed:', error);
            return false;
        }
    }

    async loadGame() {
        try {
            // Try cloud save first
            if (navigator.onLine) {
                const cloudSave = await this.dbManager.loadGameState();
                if (cloudSave) return cloudSave;
            }

            // Fall back to local save
            const localSave = localStorage.getItem(this.localKey);
            if (localSave) {
                const { state, timestamp } = JSON.parse(localSave);
                // Check if save is recent (within 24 hours)
                if (Date.now() - timestamp < 86400000) {
                    return state;
                }
            }

            return null;
        } catch (error) {
            console.error('Load failed:', error);
            return null;
        }
    }

    startSync() {
        setInterval(async () => {
            if (navigator.onLine) {
                const localSave = localStorage.getItem(this.localKey);
                if (localSave) {
                    const { state } = JSON.parse(localSave);
                    await this.dbManager.saveGameState(state);
                }
            }
        }, this.syncInterval);
    }
}
