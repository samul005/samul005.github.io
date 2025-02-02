import { DatabaseManager } from './utils.js';

class ProfileManager {
    constructor() {
        this.timestamp = "2025-02-01 16:47:55";
        this.currentUser = "samul005";
        this.dbManager = new DatabaseManager();
        
        // Achievement definitions
        this.achievements = {
            firstWin: {
                id: 'firstWin',
                name: 'First Victory',
                icon: '🏆',
                description: 'Win your first game',
                requirement: 1
            },
            perfectGame: {
                id: 'perfectGame',
                name: 'Perfect Game',
                icon: '⭐',
                description: 'Complete a game without any mistakes',
                requirement: 1
            },
            speedster: {
                id: 'speedster',
                name: 'Speedster',
                icon: '⚡',
                description: 'Complete a game in under 30 seconds',
                requirement: 1
            },
            wordMaster: {
                id: 'wordMaster',
                name: 'Word Master',
                icon: '📚',
                description: 'Win 50 games',
                requirement: 50
            },
            collector: {
                id: 'collector',
                name: 'Collector',
                icon: '💎',
                description: 'Collect all power-ups',
                requirement: 5
            }
        };

        this.initializeProfile();
    }

    async initializeProfile() {
        await this.loadUserData();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadUserData() {
        try {
            const userData = await this.dbManager.getUserData(this.currentUser);
            this.userData = userData;
            
            // Calculate level and progress
            this.calculateLevel(userData.experience || 0);
            
            // Load achievements
            this.loadAchievements();
            
            // Load inventory
            this.loadInventory();
            
            // Load game history
            this.loadGameHistory();
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    calculateLevel(experience) {
        const baseXP = 100;
        const level = Math.floor(Math.sqrt(experience / baseXP)) + 1;
        const currentLevelXP = Math.pow(level - 1, 2) * baseXP;
        const nextLevelXP = Math.pow(level, 2) * baseXP;
        const progress = ((experience - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

        this.userData.level = level;
        this.userData.levelProgress = progress;
    }

    updateUI() {
        // Update user stats
        document.getElementById('userLevel').textContent = this.userData.level;
        document.getElementById('levelProgress').style.width = `${this.userData.levelProgress}%`;
        document.getElementById('totalScore').textContent = this.userData.score || 0;
        document.getElementById('totalCoins').textContent = this.userData.coins || 0;
        document.getElementById('gamesWon').textContent = this.userData.gamesWon || 0;
        document.getElementById('timePlayed').textContent = 
            this.formatTimePlayed(this.userData.timePlayed || 0);

        // Update avatar
        if (this.userData.avatar) {
            document.querySelector('#currentAvatar img').src = this.userData.avatar;
        }

        // Update settings
        document.getElementById('soundToggle').checked = 
            this.userData.settings?.sound ?? true;
        document.getElementById('musicToggle').checked = 
            this.userData.settings?.music ?? true;
        document.getElementById('themeSelect').value = 
            this.userData.settings?.theme || 'light';
        document.getElementById('languageSelect').value = 
            this.userData.settings?.language || 'en';
    }

    loadAchievements() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        const userAchievements = this.userData.achievements || {};

        achievementsGrid.innerHTML = Object.values(this.achievements).map(achievement => `
            <div class="achievement-card ${userAchievements[achievement.id] ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <h3>${achievement.name}</h3>
                <p>${achievement.description}</p>
                <div class="achievement-progress">
                    <div class="progress-bar" style="width: ${
                        Math.min(
                            ((userAchievements[achievement.id]?.progress || 0) / 
                            achievement.requirement) * 100, 
                            100
                        )}%">
                    </div>
                    <span>${userAchievements[achievement.id]?.progress || 0}/${achievement.requirement}</span>
                </div>
            </div>
        `).join('');
    }

    loadInventory() {
        const inventory = this.userData.inventory || {};
        const inventoryContent = document.getElementById('inventoryContent');
        
        // Handle tab switching
        document.querySelectorAll('.inventory-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(t => 
                    t.classList.remove('active'));
                tab.classList.add('active');
                this.showInventoryItems(tab.dataset.tab);
            });
        });

        // Show initial inventory (power-ups)
        this.showInventoryItems('powerups');
    }

    showInventoryItems(category) {
        const inventory = this.userData.inventory || {};
        const inventoryContent = document.getElementById('inventoryContent');
        
        const items = {
            powerups: this.dbManager.powerUpsList,
            themes: this.dbManager.themesList,
            avatars: this.dbManager.avatarsList
        }[category];

        inventoryContent.innerHTML = items.map(item => `
            <div class="inventory-item ${inventory[item.id] ? 'owned' : ''}">
                <div class="item-icon">${item.icon}</div>
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                ${inventory[item.id] ? `
                    <button class="use-btn" data-item-id="${item.id}">
                        ${this.userData.activeItems?.[category] === item.id ? 'Active' : 'Use'}
                    </button>
                ` : `
                    <button class="buy-btn" onclick="window.location.href='store.html'">
                        Get ${item.price}🌀
                    </button>
                `}
            </div>
        `).join('');
    }

    loadGameHistory() {
        const historyList = document.getElementById('gameHistory');
        const gameHistory = this.userData.gameHistory || [];

        historyList.innerHTML = gameHistory
            .slice(0, 10) // Show last 10 games
            .map(game => `
                <div class="history-item">
                    <div class="game-info">
                        <span class="mode">${game.mode}</span>
                        <span class="word">${game.word}</span>
                    </div>
                    <div class="game-result ${game.won ? 'win' : 'loss'}">
                        <span>${game.won ? 'Won' : 'Lost'}</span>
                        <span class="score">+${game.score}</span>
                    </div>
                </div>
            `).join('');
    }

    setupEventListeners() {
        // Avatar change button
        document.querySelector('.change-avatar-btn').addEventListener('click', 
            () => this.showAvatarModal());

        // Settings changes
        document.getElementById('soundToggle').addEventListener('change', 
            (e) => this.updateSetting('sound', e.target.checked));
        document.getElementById('musicToggle').addEventListener('change', 
            (e) => this.updateSetting('music', e.target.checked));
        document.getElementById('themeSelect').addEventListener('change', 
            (e) => this.updateSetting('theme', e.target.value));
        document.getElementById('languageSelect').addEventListener('change', 
            (e) => this.updateSetting('language', e.target.value));

        // Inventory item usage
        document.getElementById('inventoryContent').addEventListener('click', (e) => {
            if (e.target.classList.contains('use-btn')) {
                this.useItem(e.target.dataset.itemId);
            }
        });
    }

    async updateSetting(setting, value) {
        try {
            await this.dbManager.updateUserSettings(this.currentUser, {
                [setting]: value
            });
            
            // Apply theme change immediately
            if (setting === 'theme') {
                document.documentElement.setAttribute('data-theme', value);
            }
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    }

    async useItem(itemId) {
        try {
            const category = this.getCategoryForItem(itemId);
            await this.dbManager.updateUserData(this.currentUser, {
                [`activeItems.${category}`]: itemId
            });
            
            // Refresh inventory display
            this.showInventoryItems(category);
        } catch (error) {
            console.error('Error using item:', error);
        }
    }

    getCategoryForItem(itemId) {
        // Determine category based on item ID
        if (itemId.includes('theme')) return 'themes';
        if (itemId.includes('avatar')) return 'avatars';
        return 'powerups';
    }

    formatTimePlayed(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    showAvatarModal() {
        const modal = document.getElementById('avatarModal');
        const grid = document.getElementById('avatarGrid');
        
        grid.innerHTML = this.dbManager.avatarsList
            .filter(avatar => this.userData.inventory?.[avatar.id])
            .map(avatar => `
                <div class="avatar-option ${
                    this.userData.activeItems?.avatar === avatar.id ? 'active' : ''
                }" data-avatar-id="${avatar.id}">
                    <img src="${avatar.url}" alt="${avatar.name}">
                </div>
            `).join('');
        
        modal.classList.add('active');
    }
}

// Initialize profile when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});
