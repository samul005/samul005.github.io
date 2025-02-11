import { DatabaseManager } from '../utils.js';

export class UserSettings {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.settings = {
            appearance: {
                theme: {
                    id: 'theme',
                    name: 'Theme',
                    options: ['light', 'dark', 'neon'],
                    default: 'light'
                },
                fontSize: {
                    id: 'fontSize',
                    name: 'Font Size',
                    options: ['normal', 'large', 'extra-large'],
                    default: 'normal'
                }
            },
            audio: {
                sound: {
                    id: 'sound',
                    name: 'Sound Effects',
                    type: 'toggle',
                    default: true
                },
                music: {
                    id: 'music',
                    name: 'Background Music',
                    type: 'toggle',
                    default: true
                },
                volume: {
                    id: 'volume',
                    name: 'Volume',
                    type: 'range',
                    min: 0,
                    max: 100,
                    default: 70
                }
            },
            gameplay: {
                difficulty: {
                    id: 'difficulty',
                    name: 'Default Difficulty',
                    options: ['simple', 'normal', 'hard'],
                    default: 'normal'
                },
                autoHint: {
                    id: 'autoHint',
                    name: 'Auto-use Hints',
                    type: 'toggle',
                    default: false
                }
            },
            notifications: {
                dailyReward: {
                    id: 'dailyReward',
                    name: 'Daily Reward Reminder',
                    type: 'toggle',
                    default: true
                },
                achievements: {
                    id: 'achievements',
                    name: 'Achievement Alerts',
                    type: 'toggle',
                    default: true
                }
            }
        };

        this.listeners = new Map();
    }

    async loadUserSettings(userId) {
        try {
            const userData = await this.dbManager.getUserData(userId);
            const userSettings = userData.settings || {};

            // Merge with defaults
            const mergedSettings = this.getMergedSettings(userSettings);

            // Apply settings
            this.applySettings(mergedSettings);

            return mergedSettings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    async updateSetting(userId, category, settingId, value) {
        try {
            // Validate setting
            if (!this.isValidSetting(category, settingId, value)) {
                throw new Error('Invalid setting value');
            }

            // Update in database
            await this.dbManager.updateUserSettings(userId, {
                [`settings.${category}.${settingId}`]: value
            });

            // Apply setting
            this.applySetting(category, settingId, value);

            // Notify listeners
            this.notifyListeners(category, settingId, value);

            return true;
        } catch (error) {
            console.error('Failed to update setting:', error);
            throw error;
        }
    }

    isValidSetting(category, settingId, value) {
        const setting = this.settings[category]?.[settingId];
        if (!setting) return false;

        switch (setting.type) {
            case 'toggle':
                return typeof value === 'boolean';
            case 'range':
                return typeof value === 'number' && 
                       value >= setting.min && 
                       value <= setting.max;
            default:
                return setting.options?.includes(value);
        }
    }

    applySetting(category, settingId, value) {
        switch (`${category}.${settingId}`) {
            case 'appearance.theme':
                document.documentElement.setAttribute('data-theme', value);
                break;
            case 'appearance.fontSize':
                document.body.style.fontSize = this.getFontSize(value);
                break;
            case 'audio.sound':
                window.gameManager?.setSoundEnabled(value);
                break;
            case 'audio.music':
                window.gameManager?.setMusicEnabled(value);
                break;
            case 'audio.volume':
                window.gameManager?.setVolume(value / 100);
                break;
        }
    }

    getFontSize(size) {
        const sizes = {
            'normal': '16px',
            'large': '18px',
            'extra-large': '20px'
        };
        return sizes[size] || sizes.normal;
    }

    addSettingListener(category, settingId, callback) {
        const key = `${category}.${settingId}`;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    removeSettingListener(category, settingId, callback) {
        const key = `${category}.${settingId}`;
        this.listeners.get(key)?.delete(callback);
    }

    notifyListeners(category, settingId, value) {
        const key = `${category}.${settingId}`;
        this.listeners.get(key)?.forEach(callback => {
            try {
                callback(value);
            } catch (error) {
                console.error('Error in setting listener:', error);
            }
        });
    }

    getDefaultSettings() {
        const defaults = {};
        for (const [category, settings] of Object.entries(this.settings)) {
            defaults[category] = {};
            for (const [id, setting] of Object.entries(settings)) {
                defaults[category][id] = setting.default;
            }
        }
        return defaults;
    }

    getMergedSettings(userSettings) {
        const defaults = this.getDefaultSettings();
        const merged = {};

        for (const category in defaults) {
            merged[category] = {
                ...defaults[category],
                ...userSettings[category]
            };
        }

        return merged;
    }
}