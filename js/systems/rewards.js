import { DatabaseManager } from '../utils.js';

export class RewardSystem {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.rewards = {
            newUser: {
                coins: 25,
                message: 'Welcome Bonus! 🎉',
                animation: 'confetti'
            },
            daily: {
                base: 10,
                streakBonus: {
                    3: 5,   // +5 coins after 3 days
                    7: 10,  // +10 coins after 7 days
                    14: 20, // +20 coins after 14 days
                    30: 50  // +50 coins after 30 days
                },
                powerUpChance: 0.3
            }
        };
    }

    async checkNewUserBonus(userId) {
        const userData = await this.dbManager.getUserData(userId);
        if (!userData.bonusClaimed) {
            await this.claimNewUserBonus(userId);
            return this.rewards.newUser;
        }
        return null;
    }

    async claimNewUserBonus(userId) {
        await this.dbManager.updateUserData(userId, {
            coins: firebase.firestore.FieldValue.increment(this.rewards.newUser.coins),
            bonusClaimed: true,
            firstLoginDate: new Date()
        });
    }

    async checkDailyReward(userId) {
        const userData = await this.dbManager.getUserData(userId);
        const lastClaim = userData.lastDailyReward?.toDate();
        
        if (!lastClaim || !this.isSameDay(lastClaim, new Date())) {
            const reward = this.calculateDailyReward(userData.dailyStreak || 0);
            await this.claimDailyReward(userId, reward, userData.dailyStreak || 0);
            return reward;
        }
        
        return {
            canClaim: false,
            nextClaimTime: this.getNextClaimTime(lastClaim)
        };
    }

    calculateDailyReward(currentStreak) {
        let coins = this.rewards.daily.base;
        
        // Add streak bonus
        Object.entries(this.rewards.daily.streakBonus).forEach(([days, bonus]) => {
            if (currentStreak >= parseInt(days)) {
                coins += bonus;
            }
        });

        // Random power-up chance
        const reward = {
            coins,
            streak: currentStreak + 1,
            powerUp: Math.random() < this.rewards.daily.powerUpChance
        };

        // Special milestones
        if (this.isStreakMilestone(currentStreak + 1)) {
            reward.milestone = true;
            reward.coins *= 2;
        }

        return reward;
    }

    isStreakMilestone(streak) {
        return Object.keys(this.rewards.daily.streakBonus)
            .includes(streak.toString());
    }

    async claimDailyReward(userId, reward, currentStreak) {
        const update = {
            coins: firebase.firestore.FieldValue.increment(reward.coins),
            lastDailyReward: new Date(),
            dailyStreak: reward.streak,
            'stats.totalDailyRewards': firebase.firestore.FieldValue.increment(1)
        };

        if (reward.powerUp) {
            const randomPowerUp = this.getRandomPowerUp();
            update[`powerUps.${randomPowerUp.id}`] = 
                firebase.firestore.FieldValue.increment(1);
        }

        await this.dbManager.updateUserData(userId, update);
    }

    isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    getNextClaimTime(lastClaim) {
        const tomorrow = new Date(lastClaim);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    getRandomPowerUp() {
        const powerUps = ['hint', 'shield', 'time'];
        return {
            id: powerUps[Math.floor(Math.random() * powerUps.length)],
            quantity: 1
        };
    }
}
