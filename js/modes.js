import { auth } from './auth.js';

class GameModeManager {
    constructor() {
        this.modes = {
            classic: { 
                name: 'Classic Mode', 
                description: 'Traditional Hangman gameplay',
                icon: 'fa-gamepad'
            },
            time: { 
                name: 'Time Attack', 
                description: 'Race against the clock',
                icon: 'fa-clock'
            },
            endless: { 
                name: 'Endless Mode', 
                description: 'Play until you lose',
                icon: 'fa-infinity'
            },
            lion: { 
                name: 'Lion Mode', 
                description: '4-letter words only',
                icon: 'fa-crown'
            },
            extreme: { 
                name: 'Extreme Mode', 
                description: 'Hard words, fewer lives',
                icon: 'fa-skull'
            }
        };

        // Ensure initialization only happens once
        if (window.gameModeManager) {
            return window.gameModeManager;
        }

        this.init();
        window.gameModeManager = this;
        console.log('GameModeManager initialized'); // Debug log
    }

    async init() {
        try {
            await this.checkAuth();
            this.initializeModes();
        } catch (error) {
            console.error('Mode initialization failed:', error);
            this.showError('Failed to initialize game modes');
        }
    }

    async checkAuth() {
        if (!auth.isAuthenticated()) {
            const loginUrl = `/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            window.location.href = loginUrl;
            throw new Error('Authentication required');
        }
    }

    initializeModes() {
        const modesGrid = document.getElementById('modesGrid');
        if (!modesGrid) {
            console.error('Modes grid container not found');
            return;
        }

        modesGrid.innerHTML = Object.entries(this.modes).map(([id, mode]) => `
            <div class="mode-card" data-mode="${id}">
                <i class="fas ${mode.icon}"></i>
                <h3>${mode.name}</h3>
                <p>${mode.description}</p>
                ${id === 'time' ? this.createDifficultyButtons(id) : `
                    <button type="button" class="play-btn" data-mode="${id}">Play Now</button>
                `}
            </div>
        `).join('');

        this.setupEventListeners(); // Call setupEventListeners after rendering
    }

    createDifficultyButtons(modeId) {
        return `
            <div class="difficulty-buttons">
                <button type="button" class="btn-difficulty" data-mode="${modeId}" data-difficulty="simple">Simple</button>
                <button type="button" class="btn-difficulty" data-mode="${modeId}" data-difficulty="normal">Normal</button>
                <button class="btn-difficulty" data-mode="${modeId}" data-difficulty="hard">Hard</button>
            </div>
        `;
    }

    setupEventListeners() {
        // Regular mode cards
        document.querySelectorAll('.mode-card .play-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modeCard = e.target.closest('.mode-card');
                const mode = modeCard.dataset.mode;
                this.startGame(mode, 'normal');
            });
        });

        // Difficulty buttons for time mode
        document.querySelectorAll('.btn-difficulty').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const modeCard = e.target.closest('.mode-card');
                const mode = modeCard.dataset.mode;
                const difficulty = e.target.dataset.difficulty;
                this.startGame(mode, difficulty);
            });
        });
    }

    async startGame(mode, difficulty = 'normal') {
        try {
            console.log('Starting game...', { mode, difficulty }); // Debug log

            // Disable clicked button
            const btnSelector = `[data-mode="${mode}"] [data-difficulty="${difficulty}"]`;
            const btn = document.querySelector(btnSelector);
            
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading-spinner"></span> Loading...';
            }

            // Save game state
            const gameState = {
                mode,
                difficulty,
                timestamp: Date.now()
            };
            localStorage.setItem('gameState', JSON.stringify(gameState));

            // Navigate to game page
            window.location.href = `game.html?mode=${mode}&difficulty=${difficulty}`;
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('Failed to start game');

            // Re-enable button on error
            const btnSelector = `[data-mode="${mode}"] [data-difficulty="${difficulty}"]`;
            const btn = document.querySelector(btnSelector);

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Play Now';
            }
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

// Initialize mode manager
document.addEventListener('DOMContentLoaded', () => {
    if (!window.gameModeManager) {
        window.gameModeManager = new GameModeManager();
        console.log('GameModeManager initialized on DOMContentLoaded'); // Debug log
    } else {
        console.warn('GameModeManager already initialized before DOMContentLoaded!');
    }
});
