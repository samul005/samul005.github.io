export class ProgressionSystem {
    constructor() {
        this.levelRequirements = {
            // XP required for each level
            1: 0,
            2: 100,
            3: 250,
            // ...more levels
            10: 2000,  // Avatar unlock
            25: 5000,  // Banner unlock
            35: 8000   // Premium avatar unlock
        };

        this.milestoneRewards = {
            10: { type: 'avatar', id: 'milestone_avatar_1' },
            25: { type: 'banner', id: 'milestone_banner_1' },
            35: { type: 'avatar', id: 'premium_avatar_1' }
        };
    }

    calculateLevel(xp) {
        let level = 1;
        for (const [lvl, req] of Object.entries(this.levelRequirements)) {
            if (xp >= req) level = parseInt(lvl);
            else break;
        }
        return level;
    }

    calculateProgress(xp) {
        const currentLevel = this.calculateLevel(xp);
        const nextLevel = currentLevel + 1;
        const currentLevelXP = this.levelRequirements[currentLevel];
        const nextLevelXP = this.levelRequirements[nextLevel];
        
        return {
            level: currentLevel,
            progress: ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100,
            nextLevelXP: nextLevelXP,
            currentXP: xp
        };
    }
}
