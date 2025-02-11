
export class SoundManager {
    constructor() {
        this.sounds = {
            background: new Audio('/assets/sounds/background.mp3'),
            correct: new Audio('/assets/sounds/correct.mp3'),
            wrong: new Audio('/assets/sounds/wrong.mp3'),
            win: new Audio('/assets/sounds/win.mp3'),
            lose: new Audio('/assets/sounds/lose.mp3'),
            click: new Audio('/assets/sounds/click.mp3'),
            powerup: new Audio('/assets/sounds/powerup.mp3')
        };

        this.settings = {
            soundEnabled: true,
            musicEnabled: true,
            volume: 0.7
        };

        this.setupSounds();
    }

    setupSounds() {
        // Set up background music
        this.sounds.background.loop = true;
        
        // Preload all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.load();
            sound.volume = this.settings.volume;
        });
    }

    async playSound(type) {
        if (!this.settings.soundEnabled) return;
        
        try {
            const sound = this.sounds[type];
            if (!sound) return;

            sound.currentTime = 0;
            await sound.play();
        } catch (error) {
            console.error('Sound playback failed:', error);
        }
    }

    startMusic() {
        if (this.settings.musicEnabled) {
            this.sounds.background.play().catch(console.error);
        }
    }

    stopMusic() {
        this.sounds.background.pause();
        this.sounds.background.currentTime = 0;
    }

    setVolume(volume) {
        this.settings.volume = volume;
        Object.values(this.sounds).forEach(sound => {
            sound.volume = volume;
        });
    }

    toggleSound(enabled) {
        this.settings.soundEnabled = enabled;
    }

    toggleMusic(enabled) {
        this.settings.musicEnabled = enabled;
        if (enabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
    }
}