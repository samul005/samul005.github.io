import { auth } from './auth.js';
import { DatabaseManager } from './utils.js';

class ProfileSystem {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.auth = auth;
        this.currentUser = null;
        this.userData = null;
        this.componentStatus = {
            profile: false,
            stats: false,
            achievements: false
        };
        this.init();
    }

    async init() {
        try {
            await this.validateAuth();
            await this.loadUserProfile();
            this.setupEventListeners();
            this.startAutoUpdate();
        } catch (error) {
            console.error('Profile initialization failed:', error);
            this.showError('Failed to load profile');
        }
    }

    async validateAuth() {
        if (!this.auth.isAuthenticated()) {
            window.location.href = '/login.html?returnUrl=' + encodeURIComponent(window.location.href);
            throw new Error('Authentication required');
        }
        this.currentUser = this.auth.currentUser;
    }

    async loadUserProfile() {
        try {
            this.setComponentLoading('profile');
            const userData = await this.dbManager.getUserData(this.currentUser.uid);
            
            // Verify data integrity
            if (!this.validateUserData(userData)) {
                throw new Error('Invalid user data');
            }

            this.userData = userData;
            this.setComponentReady('profile');
            this.updateProfileUI();
            this.updateStats();
            await this.loadAchievements();
            await this.loadGameHistory();
        } catch (error) {
            console.error('Failed to load user profile:', error);
            this.setComponentError('profile', error);
            throw error;
        }
    }

    validateUserData(data) {
        const required = ['username', 'level', 'coins', 'statistics'];
        return required.every(key => key in data);
    }

    updateProfileUI() {
        // Update avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.src = this.userData.avatar || 'assets/images/default-avatar.png';
            avatar.addEventListener('click', () => this.showAvatarModal());
        }

        // Update username and level
        document.getElementById('usernameDisplay').textContent = this.userData.username;
        document.getElementById('userLevel').textContent = `Level ${this.userData.level || 1}`;
        
        // Update coins with animation
        this.animateValue('coinAmount', this.userData.coins || 0);

        // Update progress bar
        const progress = document.getElementById('levelProgress');
        if (progress) {
            progress.style.width = `${this.userData.levelProgress || 0}%`;
        }
    }

    updateStats() {
        const stats = {
            gamesPlayed: this.userData.statistics?.gamesPlayed || 0,
            gamesWon: this.userData.statistics?.gamesWon || 0,
            winRate: this.calculateWinRate(),
            bestScore: this.userData.statistics?.bestScore || 0,
            totalTime: this.formatPlayTime(this.userData.statistics?.totalTime || 0)
        };

        Object.entries(stats).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) element.textContent = value;
        });
    }

    calculateWinRate() {
        const { gamesPlayed, gamesWon } = this.userData.statistics || {};
        if (!gamesPlayed) return '0%';
        return Math.round((gamesWon / gamesPlayed) * 100) + '%';
    }

    formatPlayTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    animateValue(elementId, endValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
        const increment = (endValue - startValue) / (duration / 16);
        let currentValue = startValue;

        const animate = () => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= endValue) || 
                (increment < 0 && currentValue <= endValue)) {
                element.textContent = endValue.toLocaleString();
                return;
            }
            element.textContent = Math.round(currentValue).toLocaleString();
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    startAutoUpdate() {
        // Update profile every 30 seconds
        setInterval(async () => {
            try {
                const newData = await this.dbManager.getUserData(this.currentUser.uid);
                if (newData.coins !== this.userData.coins) {
                    this.animateValue('coinAmount', newData.coins);
                }
                this.userData = newData;
                this.updateStats();
            } catch (error) {
                console.error('Auto-update failed:', error);
            }
        }, 30000);
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async loadAchievements() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        if (!achievementsGrid) return;

        const achievements = this.userData.achievements || {};
        const totalAchievements = Object.keys(this.achievements).length;
        const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length;

        document.getElementById('achievementCount').textContent = 
            `${unlockedCount}/${totalAchievements}`;

        achievementsGrid.innerHTML = Object.entries(this.achievements)
            .map(([id, achievement]) => this.createAchievementCard(id, achievement, achievements[id]))
            .join('');
    }

    async loadGameHistory() {
        const historyList = document.getElementById('gameHistory');
        if (!historyList) return;

        const gameHistory = this.userData.gameHistory || [];
        historyList.innerHTML = gameHistory
            .slice(0, 10)
            .map(game => this.createHistoryItem(game))
            .join('');
    }

    createHistoryItem(game) {
        return `
            <div class="history-item ${game.won ? 'win' : 'loss'}">
                <div class="game-info">
                    <span class="mode">${game.mode}</span>
                    <span class="word">${game.word}</span>
                </div>
                <div class="game-result">
                    <span>${game.won ? 'Won' : 'Lost'}</span>
                    <span class="score">+${game.score}</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Avatar change
        document.querySelector('.change-avatar-btn')?.addEventListener('click', 
            () => this.showAvatarModal());

        // Settings
        document.getElementById('soundToggle')?.addEventListener('change', 
            (e) => this.updateSetting('sound', e.target.checked));
        document.getElementById('musicToggle')?.addEventListener('change', 
            (e) => this.updateSetting('music', e.target.checked));
        document.getElementById('themeSelect')?.addEventListener('change', 
            (e) => this.updateSetting('theme', e.target.value));
        document.getElementById('languageSelect')?.addEventListener('change', 
            (e) => this.updateSetting('language', e.target.value));

        // Modal close
        document.querySelector('.close-modal')?.addEventListener('click', 
            () => this.closeAvatarModal());
    }

    showAvatarModal() {
        const modal = document.getElementById('avatarModal');
        if (modal) {
            modal.classList.add('active');
            this.loadAvatarOptions();
        }
    }

    async loadAvatarOptions() {
        const avatarGrid = document.getElementById('avatarGrid');
        if (!avatarGrid) return;

        const inventory = this.userData.inventory || {};
        avatarGrid.innerHTML = this.availableAvatars
            .map(avatar => `
                <div class="avatar-option ${inventory[avatar.id] ? '' : 'locked'}" 
                     data-avatar-id="${avatar.id}">
                    <img src="${avatar.url}" alt="${avatar.name}">
                    ${!inventory[avatar.id] ? `<div class="lock-overlay">🔒</div>` : ''}
                </div>
            `).join('');
    }

    async updateSetting(setting, value) {
        try {
            await this.dbManager.updateUserSettings(this.currentUser.uid, {
                [setting]: value
            });
            
            if (setting === 'theme') {
                document.documentElement.setAttribute('data-theme', value);
            }
            
            this.showSuccess(`${setting} updated successfully`);
        } catch (error) {
            this.showError(`Failed to update ${setting}`);
        }
    }
}

// Initialize profile system
document.addEventListener('DOMContentLoaded', () => {
    window.profileSystem = new ProfileSystem();
});
