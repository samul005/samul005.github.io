import { PowerUpsSystem } from './power-ups.js';
import { QuestionManager } from './question-manager.js';
import { DatabaseManager } from './utils.js';

class GameManager {
    constructor() {
        this.timestamp = "2025-02-01 16:38:08";
        this.currentUser = "samul005";
        
        this.powerUps = new PowerUpsSystem();
        this.questionManager = new QuestionManager();
        this.dbManager = new DatabaseManager();
        
        this.currentMode = null;
        this.currentQuestion = null;
        this.remainingLives = 6;
        this.score = 0;
        this.timer = null;
        this.timeLeft = 0;
        
        // Game mode configurations
        this.modeConfig = {
            classic: { lives: 6, timeLimit: null },
            lion: { lives: 6, timeLimit: null, wordLength: 4 },
            time: {
                simple: { lives: 6, timeLimit: 300 },
                normal: { lives: 6, timeLimit: 120 },
                hard: { lives: 6, timeLimit: 60 }
            },
            endless: { lives: 6, timeLimit: null },
            extreme: { lives: 5, timeLimit: null }
        };

        this.initializeGame();
    }

    async initializeGame() {
        // Get game mode from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.currentMode = urlParams.get('mode');
        const difficulty = urlParams.get('difficulty');

        // Initialize UI elements
        this.setupGameUI();
        
        // Load user data
        await this.loadUserData();
        
        // Initialize power-ups
        await this.powerUps.initializePowerUps();
        
        // Start game with first question
        await this.startNewGame(difficulty);
    }

    setupGameUI() {
        // Update header info
        document.querySelector('.timestamp').textContent = `🕒 ${this.timestamp}`;
        document.querySelector('.username').textContent = `👤 ${this.currentUser}`;

        // Setup keyboard
        this.createKeyboard();
        
        // Add event listeners
        this.addEventListeners();
    }

    createKeyboard() {
        const keyboard = document.getElementById('keyboard');
        const layout = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
        ];

        keyboard.innerHTML = layout.map(row => `
            <div class="keyboard-row">
                ${row.map(key => `
                    <button class="key" data-key="${key}">${key}</button>
                `).join('')}
            </div>
        `).join('');
    }

    addEventListeners() {
        // Keyboard input
        document.getElementById('keyboard').addEventListener('click', (e) => {
            if (e.target.classList.contains('key')) {
                this.handleGuess(e.target.dataset.key);
            }
        });

        // Physical keyboard input
        document.addEventListener('keyup', (e) => {
            const key = e.key.toUpperCase();
            if (/^[A-Z]$/.test(key)) {
                this.handleGuess(key);
            }
        });

        // Result modal buttons
        document.getElementById('nextLevelBtn').addEventListener('click', 
            () => this.startNewGame());
        document.getElementById('retryBtn').addEventListener('click', 
            () => this.retryCurrentLevel());
        document.getElementById('homeBtn').addEventListener('click', 
            () => window.location.href = 'index.html');
    }

    async startNewGame(difficulty = null) {
        // Reset game state
        this.resetGameState();
        
        // Get configuration for current mode
        const config = difficulty ? 
            this.modeConfig[this.currentMode][difficulty] : 
            this.modeConfig[this.currentMode];
        
        // Initialize lives and timer
        this.remainingLives = config.lives;
        this.updateLives();
        
        if (config.timeLimit) {
            this.startTimer(config.timeLimit);
        }
        
        // Get new question
        await this.loadNewQuestion();
        
        // Enable keyboard
        this.resetKeyboard();
    }

    async loadNewQuestion() {
        const question = await this.questionManager.getQuestionForLevel(this.currentLevel);
        this.currentQuestion = question;
        
        // Update UI with question
        document.getElementById('categoryBadge').textContent = question.category;
        document.getElementById('questionText').textContent = question.question;
        
        // Initialize word display
        this.updateWordDisplay();
    }

    updateWordDisplay(guessedLetter = null) {
        const wordDisplay = document.getElementById('wordDisplay');
        const answer = this.currentQuestion.answer;
        
        wordDisplay.innerHTML = answer
            .split('')
            .map(letter => {
                if (letter === ' ') return ' ';
                if (guessedLetter === letter) return letter;
                if (this.guessedLetters.has(letter)) return letter;
                return '_';
            })
            .join(' ');
    }

    handleGuess(letter) {
        if (this.gameOver || this.guessedLetters.has(letter)) return;
        
        this.guessedLetters.add(letter);
        const key = document.querySelector(`[data-key="${letter}"]`);
        
        if (this.currentQuestion.answer.includes(letter)) {
            // Correct guess
            key.classList.add('correct');
            this.playSound('correct');
            this.updateWordDisplay(letter);
            
            // Check for win
            if (this.checkWin()) {
                this.handleWin();
            }
        } else {
            // Wrong guess
            key.classList.add('wrong');
            this.playSound('wrong');
            this.remainingLives--;
            this.updateLives();
            
            if (this.remainingLives <= 0) {
                this.handleLoss();
            }
        }
    }

    checkWin() {
        return this.currentQuestion.answer
            .split('')
            .every(letter => letter === ' ' || this.guessedLetters.has(letter));
    }

    async handleWin() {
        clearInterval(this.timer);
        this.gameOver = true;
        
        // Calculate score and rewards
        const timeBonus = this.timeLeft > 0 ? Math.floor(this.timeLeft / 10) : 0;
        const reward = {
            coins: 50 + timeBonus,
            score: 100 + (timeBonus * 2)
        };
        
        // Update user data
        await this.dbManager.updateUserProgress(this.currentUser, {
            coins: reward.coins,
            score: reward.score,
            gamesWon: 1
        });
        
        // Show win animation and play sound
        this.playSound('win');
        this.showGameResult('win', reward);
    }

    handleLoss() {
        clearInterval(this.timer);
        this.gameOver = true;
        
        // Reveal answer
        document.getElementById('wordDisplay').textContent = 
            this.currentQuestion.answer;
        
        // Show loss animation
        this.showGameResult('lose');
    }

    showGameResult(result, reward = null) {
        const modal = document.getElementById('resultModal');
        const message = document.getElementById('resultMessage');
        
        if (result === 'win') {
            message.innerHTML = `
                <h2>🎉 Congratulations!</h2>
                <p>You solved the word correctly!</p>
            `;
            document.getElementById('finalScore').textContent = reward.score;
            document.getElementById('coinsEarned').textContent = reward.coins;
        } else {
            message.innerHTML = `
                <h2>😢 Game Over</h2>
                <p>The word was: ${this.currentQuestion.answer}</p>
            `;
        }
        
        document.getElementById('finalTime').textContent = 
            this.formatTime(this.timeLeft);
        
        modal.classList.add('active');
    }

    startTimer(duration) {
        this.timeLeft = duration;
        clearInterval(this.timer);
        
        const timerDisplay = document.getElementById('timer');
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            timerDisplay.textContent = this.formatTime(this.timeLeft);
            
            if (this.timeLeft <= 10) {
                timerDisplay.classList.add('warning');
            }
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleLoss();
            }
        }, 1000);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    playSound(type) {
        const sound = document.getElementById(`${type}Sound`);
        sound.currentTime = 0;
        sound.play();
    }

    resetGameState() {
        this.gameOver = false;
        this.guessedLetters = new Set();
        clearInterval(this.timer);
        document.querySelector('.timer')?.classList.remove('warning');
    }

    resetKeyboard() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('correct', 'wrong');
            key.disabled = false;
        });
    }

    async loadUserData() {
        const userData = await this.dbManager.getUserData(this.currentUser);
        this.currentLevel = userData.level || 1;
        document.getElementById('currentLevel').textContent = this.currentLevel;
        document.getElementById('currentCoins').textContent = userData.coins || 0;
    }
}

// Initialize game when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new GameManager();
});
