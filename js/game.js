import { auth } from './auth.js';
import { Utils, DatabaseManager } from './utils.js';

class Game {
    constructor() {
        this.mode = null;
        this.difficulty = 'normal';
        this.word = '';
        this.guessedLetters = [];
        this.remainingGuesses = 6;
        this.score = 0;
        this.coins = 0;
        this.startTime = null;
        this.endTime = null;
        this.timerInterval = null;
        this.elapsedTime = 0;
        this.isGameOver = false;

        this.wordList = {
            classic: ['hangman', 'javascript', 'developer', 'interface', 'application', 'programming'],
            time: ['algorithm', 'variable', 'function', 'asynchronous', 'debugging', 'parameter'],
            endless: ['iteration', 'recursion', 'polymorphism', 'inheritance', 'encapsulation', 'abstraction'],
            lion: ['code', 'test', 'bug', 'run', 'fix', 'add'],
            extreme: ['cryptography', 'quantum', 'blockchain', 'artificial', 'intelligence', 'nanotechnology']
        };

        this.init();
    }

    async init() {
        try {
            await this.checkAuth();
            this.loadGameState();
            this.setupEventListeners();
            this.startGame();
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showError('Failed to initialize game');
        }
    }

    async checkAuth() {
        if (!auth.isAuthenticated()) {
            const loginUrl = `/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            window.location.href = loginUrl;
            throw new Error('Authentication required');
        }
    }

    loadGameState() {
        const gameState = JSON.parse(localStorage.getItem('gameState'));
        if (gameState) {
            this.mode = gameState.mode;
            this.difficulty = gameState.difficulty;
        } else {
            this.mode = 'classic';
            this.difficulty = 'normal';
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (this.isGameOver) return;
            if (event.key.match(/^[a-z]$/)) {
                this.guessLetter(event.key);
            }
        });
    }

    startGame() {
        this.resetGame();
        this.selectWord();
        this.updateUI();

        if (this.mode === 'time') {
            this.startTimer();
        }
    }

    resetGame() {
        this.guessedLetters = [];
        this.remainingGuesses = 6;
        this.score = 0;
        this.coins = 0;
        this.elapsedTime = 0;
        this.startTime = null;
        this.endTime = null;
        this.isGameOver = false;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    selectWord() {
        if (!this.wordList[this.mode]) {
            this.mode = 'classic';
        }
        this.word = Utils.getRandomItem(this.wordList[this.mode]);
    }

    guessLetter(letter) {
        letter = letter.toLowerCase();
        if (this.guessedLetters.includes(letter)) {
            return;
        }
        this.guessedLetters.push(letter);

        if (!this.word.includes(letter)) {
            this.remainingGuesses--;
        }

        this.updateUI();
        this.checkGameStatus();
    }

    updateUI() {
        const wordDisplay = document.getElementById('wordDisplay');
        const guessedLettersDisplay = document.getElementById('guessedLetters');
        const remainingGuessesDisplay = document.getElementById('remainingGuesses');
        const scoreDisplay = document.getElementById('score');
        const coinsDisplay = document.getElementById('coins');
        const timerDisplay = document.getElementById('timer');

        wordDisplay.textContent = this.getDisplayedWord();
        guessedLettersDisplay.textContent = `Guessed letters: ${this.guessedLetters.join(', ')}`;
        remainingGuessesDisplay.textContent = `Remaining guesses: ${this.remainingGuesses}`;
        scoreDisplay.textContent = `Score: ${this.score}`;
        coinsDisplay.textContent = `Coins: ${this.coins}`;

        if (timerDisplay) {
            timerDisplay.textContent = `Time: ${this.formatTime(this.elapsedTime)}`;
        }
    }

    getDisplayedWord() {
        let displayedWord = '';
        for (let letter of this.word) {
            if (this.guessedLetters.includes(letter)) {
                displayedWord += letter;
            } else {
                displayedWord += '_';
            }
            displayedWord += ' ';
        }
        return displayedWord.trim();
    }

    checkGameStatus() {
        if (this.remainingGuesses <= 0) {
            this.endGame(false);
        }

        if (!this.getDisplayedWord().includes('_')) {
            this.endGame(true);
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateUI();
        }, 100);
    }

    endTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.endTime = Date.now();
    }

    formatTime(ms) {
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        let milliseconds = ms % 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    async endGame(win) {
        this.isGameOver = true;
        this.endTimer();
        let message = win ? 'You win!' : 'You lose!';
        message += ` The word was ${this.word}.`;

        if (win) {
            this.score += 100;
            this.coins += 50;
        }

        alert(message);
        this.updateUI();

        try {
            const userId = auth.getCurrentUser().uid;
            const databaseManager = new DatabaseManager();
            await databaseManager.updateUserProgress(userId, {
                coins: this.coins,
                score: this.score,
                gamesWon: win ? 1 : 0
            });
        } catch (error) {
            console.error('Failed to update user progress:', error);
            this.showError('Failed to save game progress');
        }

        this.startGame();
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

document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
