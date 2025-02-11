export class AchievementSystem {
    constructor() {
        this.achievements = {
            firstWin: {
                id: 'firstWin',
                name: 'First Victory',
                description: 'Win your first game',
                icon: '🏆',
                reward: { coins: 50 }
            },
            streak3: {
                id: 'streak3',
                name: 'Hat Trick',
                description: 'Win 3 games in a row',
                icon: '🔥',
                reward: { coins: 100 }
            },
            // ...more achievements
        };

        this.achievementTiers = {
            bronze: { multiplier: 1, icon: '🥉' },
            silver: { multiplier: 1.5, icon: '🥈' },
            gold: { multiplier: 2, icon: '🥇' },
            platinum: { multiplier: 3, icon: '🏆' }
        };
    }

    meetsRequirements(achievement, userData, gameResult) {
        switch (achievement.id) {
            case 'firstWin':
                return gameResult.won && userData.statistics.gamesWon === 0;
            case 'streak3':
                return userData.statistics.currentStreak >= 3;
            case 'speedster':
                return gameResult.won && gameResult.time < 60;
            case 'perfectGame':
                return gameResult.won && gameResult.mistakes === 0;
            default:
                return false;
        }
    }

    async checkAchievements(userData, gameResult) {
        const unlockedAchievements = [];
        
        for (const [id, achievement] of Object.entries(this.achievements)) {
            if (!userData.achievements[id] && this.meetsRequirements(achievement, userData, gameResult)) {
                unlockedAchievements.push(achievement);
            }
        }

        return unlockedAchievements;
    }

    async unlockAchievement(userId, achievementId) {
        try {
            const achievement = this.achievements[achievementId];
            if (!achievement) throw new Error('Achievement not found');

            // Update user achievements
            await this.dbManager.updateUserAchievements(userId, {
                [`achievements.${achievementId}`]: {
                    unlocked: true,
                    unlockedAt: new Date(),
                    reward: achievement.reward
                }
            });

            // Grant rewards
            if (achievement.reward) {
                await this.grantAchievementReward(userId, achievement.reward);
            }

            return {
                achievement,
                reward: achievement.reward
            };
        } catch (error) {
            console.error('Failed to unlock achievement:', error);
            throw error;
        }
    }

    async grantAchievementReward(userId, reward) {
        if (reward.coins) {
            await this.dbManager.updateUserCoins(userId, reward.coins);
        }
        if (reward.item) {
            await this.dbManager.addInventoryItem(userId, reward.item);
        }
    }

    getProgress(achievementId, userData) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return 0;

        switch (achievementId) {
            case 'streak3':
                return (userData.statistics.currentStreak / 3) * 100;
            case 'gamesWon':
                return (userData.statistics.gamesWon / achievement.target) * 100;
            default:
                return 0;
        }
    }
}
