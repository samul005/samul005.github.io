export class PowerUpsSoundManager {
    constructor() {
        this.sounds = {
            activate: new Audio('/assets/sounds/power-up-activate.mp3'),
            collect: new Audio('/assets/sounds/power-up-collect.mp3'),
            success: new Audio('/assets/sounds/power-up-success.mp3'),
            shield: new Audio('/assets/sounds/shield-block.mp3'),
            time: new Audio('/assets/sounds/time-extend.mp3')
        };

        // Preload sounds
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });
    }

    async playSound(type) {
        try {
            const sound = this.sounds[type];
            if (!sound) return;

            sound.currentTime = 0;
            await sound.play();
        } catch (error) {
            console.error('Failed to play sound:', error);
        }
    }

    setVolume(volume) {
        Object.values(this.sounds).forEach(sound => {
            sound.volume = volume;
        });
    }

    mute() {
        Object.values(this.sounds).forEach(sound => {
            sound.muted = true;
        });
    }

    unmute() {
        Object.values(this.sounds).forEach(sound => {
            sound.muted = false;
        });
    }
}
