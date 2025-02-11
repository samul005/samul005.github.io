import { PowerUpTypes } from '../config/power-ups.js';
import { DatabaseManager } from '../utils.js';

export class PowerUpsManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.dbManager = new DatabaseManager();
        this.activePowerUps = new Map();
        this.inventory = new Map();
        this.pendingAnimations = new Set();
    }

    async initialize() {
        await this.loadInventory();
        this.renderPowerUpPanel();
        this.setupEventListeners();
    }

    async loadInventory() {
        const userData = await this.dbManager.getUserData(this.game.currentUser);
        Object.entries(userData.powerUps || {}).forEach(([id, quantity]) => {
            this.inventory.set(id, quantity);
        });
    }

    renderPowerUpPanel() {
        const panel = document.createElement('div');
        panel.className = 'power-ups-panel';
        panel.innerHTML = `
            <div class="power-ups-grid">
                ${Array.from(this.inventory.entries()).map(([id, quantity]) => `
                    <div class="power-up-item" data-id="${id}">
                        <div class="power-up-icon">${PowerUpTypes[id].icon}</div>
                        <div class="power-up-count">${quantity}</div>
                        ${quantity === 0 ? `
                            <button class="buy-more-btn" data-id="${id}">
                                Buy (${PowerUpTypes[id].price}🌀)
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        document.querySelector('.game-ui').appendChild(panel);
    }

    setupEventListeners() {
        document.querySelectorAll('.power-up-item').forEach(item => {
            item.addEventListener('click', () => this.activatePowerUp(item.dataset.id));
        });

        document.querySelectorAll('.buy-more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handlePurchase(btn.dataset.id);
            });
        });
    }

    async activatePowerUp(powerUpId) {
        if (!this.canUsePowerUp(powerUpId)) return;

        const powerUp = PowerUpTypes[powerUpId];
        this.inventory.set(powerUpId, this.inventory.get(powerUpId) - 1);
        this.activePowerUps.set(powerUpId, true);

        // Play activation animation
        await this.playAnimation(powerUpId);

        // Apply power-up effect
        await this.applyEffect(powerUpId);

        // Update UI
        this.updatePowerUpDisplay(powerUpId);
    }

    canUsePowerUp(powerUpId) {
        return this.inventory.get(powerUpId) > 0 && 
               !this.activePowerUps.get(powerUpId) &&
               !this.game.gameOver;
    }

    async playAnimation(powerUpId) {
        const powerUp = PowerUpTypes[powerUpId];
        const animation = document.createElement('div');
        animation.className = `power-up-animation ${powerUp.animation}`;
        animation.innerHTML = powerUp.icon;
        
        document.querySelector('.game-ui').appendChild(animation);
        await new Promise(resolve => setTimeout(resolve, 1000));
        animation.remove();
    }

    async applyEffect(powerUpId) {
        switch (powerUpId) {
            case 'second_chance':
                this.game.resurrectPlayer();
                break;
            case 'reveal_letter':
                this.game.revealRandomLetter();
                break;
            case 'extra_hint':
                this.game.showExtraHint();
                break;
            case 'time_boost':
                this.game.addExtraTime(30);
                break;
            case 'shield':
                this.game.activateShield();
                break;
        }
    }

    updatePowerUpDisplay(powerUpId) {
        const item = document.querySelector(`.power-up-item[data-id="${powerUpId}"]`);
        const count = this.inventory.get(powerUpId);
        
        item.querySelector('.power-up-count').textContent = count;
        
        if (count === 0) {
            item.innerHTML += `
                <button class="buy-more-btn" data-id="${powerUpId}">
                    Buy (${PowerUpTypes[powerUpId].price}🌀)
                </button>
            `;
            this.setupEventListeners(); // Reattach listeners
        }
    }

    async handlePurchase(powerUpId) {
        try {
            const powerUp = PowerUpTypes[powerUpId];
            await this.game.store.purchaseItem(this.game.currentUser, powerUpId);
            
            // Update inventory
            this.inventory.set(powerUpId, (this.inventory.get(powerUpId) || 0) + 1);
            this.updatePowerUpDisplay(powerUpId);
            
            this.game.showSuccess(`Purchased ${powerUp.name}!`);
        } catch (error) {
            this.game.showError('Purchase failed: ' + error.message);
        }
    }
}
