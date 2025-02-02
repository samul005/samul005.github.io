import { DatabaseManager } from './utils.js';

class StoreManager {
    constructor() {
        this.timestamp = "2025-02-01 16:42:30";
        this.currentUser = "samul005";
        this.dbManager = new DatabaseManager();
        
        // Store items configuration
        this.storeItems = {
            powerups: {
                secondChance: {
                    id: 'secondChance',
                    name: 'Second Chance',
                    icon: '🔄',
                    description: 'Get one extra life after losing',
                    price: 75,
                    type: 'powerup'
                },
                revealLetter: {
                    id: 'revealLetter',
                    name: 'Reveal Letter',
                    icon: '🕵️',
                    description: 'Automatically reveal a correct letter',
                    price: 50,
                    type: 'powerup'
                },
                extraHint: {
                    id: 'extraHint',
                    name: 'Extra Hint',
                    icon: '💡',
                    description: 'Unlock additional hints for the word',
                    price: 25,
                    type: 'powerup'
                },
                timeBoost: {
                    id: 'timeBoost',
                    name: 'Time Boost',
                    icon: '⏳',
                    description: 'Add 30 seconds in Time Challenge Mode',
                    price: 50,
                    type: 'powerup'
                },
                shield: {
                    id: 'shield',
                    name: 'Shield',
                    icon: '🛡️',
                    description: 'Protect against one wrong guess',
                    price: 75,
                    type: 'powerup',
                    premium: true
                }
            },
            themes: {
                neon: {
                    id: 'neon',
                    name: 'Neon Theme',
                    icon: '🌈',
                    description: 'Vibrant neon colors and glowing effects',
                    price: 200,
                    type: 'theme'
                },
                space: {
                    id: 'space',
                    name: 'Space Theme',
                    icon: '🚀',
                    description: 'Dark space theme with star effects',
                    price: 250,
                    type: 'theme',
                    premium: true
                },
                retro: {
                    id: 'retro',
                    name: 'Retro Theme',
                    icon: '👾',
                    description: 'Classic 8-bit style design',
                    price: 150,
                    type: 'theme'
                }
            },
            avatars: {
                ninja: {
                    id: 'ninja',
                    name: 'Ninja Avatar',
                    icon: '🥷',
                    description: 'Stealthy ninja character',
                    price: 100,
                    type: 'avatar'
                },
                wizard: {
                    id: 'wizard',
                    name: 'Wizard Avatar',
                    icon: '🧙‍♂️',
                    description: 'Magical wizard character',
                    price: 100,
                    type: 'avatar'
                },
                robot: {
                    id: 'robot',
                    name: 'Robot Avatar',
                    icon: '🤖',
                    description: 'Mechanical robot character',
                    price: 150,
                    type: 'avatar',
                    premium: true
                }
            }
        };

        this.initializeStore();
    }

    async initializeStore() {
        // Load user data
        await this.loadUserData();
        
        // Setup store UI
        this.setupStoreTabs();
        this.loadStoreItems();
        this.setupEventListeners();
    }

    async loadUserData() {
        try {
            const userData = await this.dbManager.getUserData(this.currentUser);
            document.getElementById('userCoins').textContent = userData.coins || 0;
            this.userCoins = userData.coins || 0;
            this.userInventory = userData.inventory || {};
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    setupStoreTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
                
                // Load items for selected category
                this.loadStoreItems(tab.dataset.tab);
            });
        });
    }

    loadStoreItems(category = 'powerups') {
        const grid = document.getElementById(`${category}Grid`);
        const items = this.storeItems[category];
        
        grid.innerHTML = Object.values(items).map(item => `
            <div class="store-item ${item.premium ? 'premium-item' : ''}">
                ${item.premium ? '<span class="premium-badge">Premium</span>' : ''}
                <div class="item-icon">${item.icon}</div>
                <h3 class="item-name">${item.name}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-price">
                    ${item.discount ? `
                        <span class="price-discount">${item.price}🌀</span>
                        <span>${Math.floor(item.price * (1 - item.discount))}🌀</span>
                    ` : `
                        <span>${item.price}🌀</span>
                    `}
                </div>
                <button class="buy-btn" 
                        data-item-id="${item.id}"
                        data-item-type="${item.type}"
                        ${this.userCoins < item.price ? 'disabled' : ''}>
                    ${this.userInventory[item.id] ? 'Owned' : 'Buy Now'}
                </button>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Purchase buttons
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.target.dataset.itemId;
                const itemType = e.target.dataset.itemType;
                await this.handlePurchase(itemId, itemType);
            });
        });

        // Modal buttons
        document.getElementById('confirmPurchase').addEventListener('click',
            () => this.confirmPurchase());
        document.getElementById('cancelPurchase').addEventListener('click',
            () => this.cancelPurchase());
    }

    async handlePurchase(itemId, itemType) {
        const item = this.storeItems[itemType + 's'][itemId];
        
        if (!item || this.userInventory[itemId]) return;
        
        const finalPrice = item.discount ? 
            Math.floor(item.price * (1 - item.discount)) : 
            item.price;
            
        if (this.userCoins < finalPrice) {
            this.showNotEnoughCoinsError();
            return;
        }

        // Show confirmation modal
        this.showPurchaseConfirmation(item, finalPrice);
    }

    showPurchaseConfirmation(item, price) {
        const modal = document.getElementById('purchaseModal');
        const preview = document.getElementById('itemPreview');
        const priceInfo = document.getElementById('priceInfo');
        
        preview.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
        `;
        
        priceInfo.innerHTML = `
            <p>Price: ${price}🌀</p>
            <p>Your Balance: ${this.userCoins}🌀</p>
            <p>Remaining Balance: ${this.userCoins - price}🌀</p>
        `;
        
        this.pendingPurchase = { item, price };
        modal.classList.add('active');
    }

    async confirmPurchase() {
        if (!this.pendingPurchase) return;
        
        const { item, price } = this.pendingPurchase;
        
        try {
            // Update user data in database
            await this.dbManager.updateUserData(this.currentUser, {
                coins: this.userCoins - price,
                [`inventory.${item.id}`]: true
            });
            
            // Update local data
            this.userCoins -= price;
            this.userInventory[item.id] = true;
            
            // Update UI
            document.getElementById('userCoins').textContent = this.userCoins;
            this.loadStoreItems(item.type + 's');
            
            // Show success animation
            this.showSuccessAnimation();
        } catch (error) {
            console.error('Purchase failed:', error);
            this.showErrorMessage('Purchase failed. Please try again.');
        }
        
        // Close modal
        document.getElementById('purchaseModal').classList.remove('active');
        this.pendingPurchase = null;
    }

    cancelPurchase() {
        document.getElementById('purchaseModal').classList.remove('active');
        this.pendingPurchase = null;
    }

    showSuccessAnimation() {
        const animation = document.getElementById('successAnimation');
        animation.style.display = 'block';
        
        setTimeout(() => {
            animation.style.display = 'none';
        }, 3000);
    }

    showNotEnoughCoinsError() {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = 'Not enough coins!';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize store when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new StoreManager();
});
