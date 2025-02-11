import { StoreItems } from './config/store-config.js';
import { DatabaseManager } from './utils.js';
import { PurchaseModal } from './components/purchase-modal.js';
import { SuccessAnimation } from './components/success-animation.js';

class StoreManager {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.items = StoreItems;
        this.init();

        this.purchaseModal = new PurchaseModal(async () => {
            await this.completePurchase();
        });
        this.successAnimation = new SuccessAnimation();
        this.pendingPurchase = null;
    }

    async init() {
        try {
            await this.loadUserData();
            this.renderCategories();
            this.setupEventListeners();
            this.updateCoinsDisplay();
        } catch (error) {
            console.error('Store initialization failed:', error);
            this.showError('Failed to load store');
        }
    }

    async loadUserData() {
        const userData = await this.dbManager.getUserData();
        this.userCoins = userData.coins || 0;
        this.userInventory = userData.inventory || {};
    }

    renderCategories() {
        // Render Power-ups
        this.renderSection('powerUps', 'powerupsSection');
        // Render Themes
        this.renderSection('themes', 'themesSection');
        // Render Avatars
        this.renderSection('avatars', 'avatarsSection');
    }

    renderSection(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const items = this.items[category];
        container.innerHTML = Object.values(items).map(item => `
            <div class="store-item" data-id="${item.id}">
                ${item.preview ? `
                    <div class="preview-container">
                        <img src="${item.preview}" alt="${item.name}">
                    </div>
                ` : `
                    <div class="item-icon">${item.icon}</div>
                `}
                <h3 class="item-name">${item.name}</h3>
                <p class="item-description">${item.description}</p>
                ${this.renderPrice(item)}
                ${this.renderPurchaseButton(item)}
            </div>
        `).join('');
    }

    renderPrice(item) {
        const isOwned = this.userInventory[item.id];
        if (isOwned && item.type !== 'consumable') {
            return '<div class="item-price owned">Owned</div>';
        }

        return `
            <div class="item-price">
                ${item.price === 0 ? 'Free' : `
                    <span class="price-amount">${item.price}</span>
                    <span class="coin-icon">🌀</span>
                `}
            </div>
        `;
    }

    renderPurchaseButton(item) {
        const isOwned = this.userInventory[item.id];
        const canAfford = this.userCoins >= item.price;
        const isLocked = item.requiredLevel && this.userLevel < item.requiredLevel;

        if (isOwned && item.type !== 'consumable') {
            return '<button class="purchase-btn owned" disabled>Owned</button>';
        }

        if (isLocked) {
            return `
                <button class="purchase-btn locked" disabled>
                    Unlock at Level ${item.requiredLevel}
                </button>
            `;
        }

        return `
            <button class="purchase-btn ${!canAfford ? 'disabled' : ''}" 
                    ${!canAfford ? 'disabled' : ''}
                    data-id="${item.id}">
                ${canAfford ? 'Purchase' : 'Not enough coins'}
            </button>
        `;
    }

    updateCoinsDisplay() {
        const coinsDisplay = document.getElementById('userCoins');
        if (coinsDisplay) {
            coinsDisplay.textContent = this.userCoins.toLocaleString();
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Purchase buttons
        document.querySelectorAll('.purchase-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePurchase(e));
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.store-section').forEach(section => {
            section.classList.toggle('active', section.id === `${tabId}Section`);
        });
    }

    async handlePurchase(itemId) {
        try {
            const item = this.findItem(itemId);
            if (!item) throw new Error('Item not found');

            // Check if user can afford
            if (this.userCoins < item.price) {
                throw new Error('Not enough coins');
            }

            this.pendingPurchase = item;
            this.purchaseModal.show(item, this.userCoins);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async completePurchase() {
        if (!this.pendingPurchase) return;

        try {
            const result = await this.dbManager.purchaseItem(
                this.currentUser.uid,
                this.pendingPurchase.id
            );

            if (result.success) {
                // Update local state
                this.userCoins -= this.pendingPurchase.price;
                this.updateCoinsDisplay();
                this.updateItemDisplay(this.pendingPurchase.id);

                // Show success animation
                this.successAnimation.show();

                // Clear pending purchase
                this.pendingPurchase = null;
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    updateItemDisplay(itemId) {
        const itemElement = document.querySelector(`[data-id="${itemId}"]`);
        if (!itemElement) return;

        if (this.pendingPurchase.type === 'consumable') {
            const countElement = itemElement.querySelector('.power-up-count');
            const currentCount = parseInt(countElement.textContent);
            countElement.textContent = currentCount + 1;
        } else {
            itemElement.innerHTML = this.renderOwnedItem(this.pendingPurchase);
        }
    }

    // ...rest of existing code...
}

// Initialize store when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new StoreManager();
});
