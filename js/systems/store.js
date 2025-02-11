import { StoreItems } from '../config/store-config.js';
import { DatabaseManager } from '../utils.js';

export class StoreManager {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.items = {
            powerups: {
                hint: { id: 'hint', name: 'Hint', price: 25, icon: '💡' },
                extraTime: { id: 'extraTime', name: 'Extra Time', price: 45, icon: '⏳' },
                secondChance: { id: 'secondChance', name: 'Second Chance', price: 80, icon: '❤️' },
                doubleCoins: { id: 'doubleCoins', name: 'Double Coins', price: 50, icon: '🌟' }
            },
            avatars: {
                // Default avatars
                default1: { id: 'default1', name: 'Default 1', price: 0, premium: false },
                // Premium avatars
                premium1: { id: 'premium1', name: 'Premium 1', price: 500, premium: true }
            },
            themes: {
                dark: { id: 'dark', name: 'Dark Theme', price: 200 },
                neon: { id: 'neon', name: 'Neon Theme', price: 300 }
            }
        };

        this.activePromotions = new Map();
        this.purchaseHistory = new Map();
    }

    async canPurchaseItem(userId, itemId) {
        const item = this.findItem(itemId);
        if (!item) throw new Error('Item not found');

        const userData = await this.dbManager.getUserData(userId);
        
        // Check level requirement
        if (item.requiredLevel && userData.level < item.requiredLevel) {
            throw new Error(`Requires level ${item.requiredLevel}`);
        }

        // Check if already owned for non-consumables
        if (item.type !== 'consumable' && userData.inventory?.[itemId]) {
            throw new Error('Already owned');
        }

        // Check if enough coins
        if (userData.coins < item.price) {
            throw new Error('Not enough coins');
        }

        return true;
    }

    async purchaseItem(userId, itemId, quantity = 1) {
        try {
            await this.canPurchaseItem(userId, itemId);
            const item = this.findItem(itemId);
            
            await this.dbManager.runTransaction(async (transaction) => {
                const userData = await this.dbManager.getUserData(userId);
                
                // Update inventory based on item type
                const updates = {
                    coins: userData.coins - (item.price * quantity)
                };

                if (item.type === 'consumable') {
                    updates[`inventory.powerUps.${itemId}`] = 
                        (userData.inventory?.powerUps?.[itemId] || 0) + quantity;
                } else {
                    updates[`inventory.${item.type}s.${itemId}`] = {
                        unlocked: true,
                        unlockedAt: new Date()
                    };
                }

                await transaction.update(userId, updates);
            });

            return { success: true, item, quantity };
        } catch (error) {
            console.error('Purchase failed:', error);
            throw error;
        }
    }

    findItem(itemId) {
        for (const category of Object.values(StoreItems)) {
            if (category[itemId]) return category[itemId];
        }
        return null;
    }

    getUnlockableItems(userData) {
        const unlockable = [];
        for (const [category, items] of Object.entries(StoreItems)) {
            for (const item of Object.values(items)) {
                if (item.requiredLevel && 
                    userData.level >= item.requiredLevel && 
                    !userData.inventory?.[category]?.[item.id]) {
                    unlockable.push(item);
                }
            }
        }
        return unlockable;
    }

    async applyPromotion(code) {
        const promotion = this.activePromotions.get(code);
        if (!promotion || !promotion.isValid()) {
            throw new Error('Invalid promotion code');
        }
        return promotion.discount;
    }

    async getRecommendations(userId) {
        const userData = await this.dbManager.getUserData(userId);
        const recommendations = [];

        // Add power-ups based on game mode preference
        if (userData.statistics.favoriteMode === 'time') {
            recommendations.push(this.items.powerups.extraTime);
        }

        // Add items based on level
        if (userData.level >= 10) {
            recommendations.push(this.items.avatars.premium1);
        }

        return recommendations;
    }

    renderStoreButton() {
        const button = document.createElement('button');
        button.className = 'store-button';
        button.innerHTML = `
            <i class="fas fa-store"></i>
            ${this.hasNewItems() ? '<span class="notification">New</span>' : ''}
        `;
        button.addEventListener('click', () => window.location.href = 'store.html');
        document.body.appendChild(button);
    }

    hasNewItems() {
        return Object.values(this.activePromotions).some(promo => 
            !this.purchaseHistory.has(promo.id)
        );
    }

    async applyDiscount(itemId, code) {
        const item = this.findItem(itemId);
        if (!item) throw new Error('Item not found');

        const promotion = this.activePromotions.get(code);
        if (!promotion || !promotion.isValid()) {
            throw new Error('Invalid promotion code');
        }

        const discountedPrice = Math.floor(item.price * (1 - promotion.discount));
        return {
            originalPrice: item.price,
            discountedPrice,
            savings: item.price - discountedPrice
        };
    }

    getHotDeals() {
        return Object.values(this.items)
            .flat()
            .filter(item => 
                item.price > 0 && 
                !this.purchaseHistory.has(item.id)
            )
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
    }

    async purchaseBundle(userId, bundleId) {
        const bundle = this.bundles[bundleId];
        if (!bundle) throw new Error('Bundle not found');

        return this.dbManager.runTransaction(async (transaction) => {
            const userData = await this.dbManager.getUserData(userId);
            
            if (userData.coins < bundle.price) {
                throw new Error('Not enough coins');
            }

            const updates = {
                coins: userData.coins - bundle.price
            };

            bundle.items.forEach(item => {
                updates[`inventory.${item.type}s.${item.id}`] = {
                    unlocked: true,
                    unlockedAt: new Date()
                };
            });

            await transaction.update(userId, updates);
            return { success: true, bundle };
        });
    }
}