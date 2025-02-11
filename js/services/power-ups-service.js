import { PowerUpTypes } from '../config/power-ups.js';
import { DatabaseManager } from '../utils.js';

export class PowerUpsService {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.dailyRewardConfig = {
            baseCoins: 50,
            powerUpChance: 0.3,
            streakBonus: 10
        };
    }

    async getDailyReward(userId) {
        const userData = await this.dbManager.getUserData(userId);
        const lastClaim = userData.lastDailyReward;
        
        if (this.canClaimDaily(lastClaim)) {
            const reward = this.generateDailyReward(userData.dailyStreak || 0);
            await this.claimDailyReward(userId, reward);
            return reward;
        }
        
        throw new Error('Daily reward already claimed');
    }

    canClaimDaily(lastClaim) {
        if (!lastClaim) return true;
        const now = new Date();
        const last = lastClaim.toDate();
        return !this.isSameDay(now, last);
    }

    generateDailyReward(streak) {
        const reward = {
            coins: this.dailyRewardConfig.baseCoins + (streak * this.dailyRewardConfig.streakBonus),
            powerUps: []
        };

        // Random power-up chance
        if (Math.random() < this.dailyRewardConfig.powerUpChance) {
            const randomPowerUp = this.getRandomPowerUp();
            reward.powerUps.push(randomPowerUp);
        }

        return reward;
    }

    getRandomPowerUp() {
        const powerUps = Object.values(PowerUpTypes);
        return powerUps[Math.floor(Math.random() * powerUps.length)];
    }

    isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    async claimDailyReward(userId, reward) {
        await this.dbManager.updateUserData(userId, {
            coins: firebase.firestore.FieldValue.increment(reward.coins),
            dailyStreak: firebase.firestore.FieldValue.increment(1),
            lastDailyReward: new Date(),
            [`powerUps.${reward.powerUps.map(p => p.id)}`]: 
                firebase.firestore.FieldValue.increment(1)
        });
    }
}
