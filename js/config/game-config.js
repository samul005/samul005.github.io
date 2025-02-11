export const GameConfig = {
    defaultSettings: {
        sound: true,
        music: true,
        theme: 'light',
        difficulty: 'normal',
        autoHint: false
    },
    
    difficultyLevels: {
        simple: {
            lives: 6,
            timeLimit: 300,
            hintCount: 3,
            scoreMultiplier: 1
        },
        normal: {
            lives: 6,
            timeLimit: 120,
            hintCount: 2,
            scoreMultiplier: 1.5
        },
        hard: {
            lives: 5,
            timeLimit: 60,
            hintCount: 1,
            scoreMultiplier: 2
        }
    },

    levelRequirements: {
        1: 0,
        2: 100,
        3: 250,
        4: 500,
        5: 1000,
        // ...more levels
    },

    rewards: {
        win: {
            baseCoins: 50,
            timeBonus: true,
            streakBonus: true
        },
        daily: {
            baseCoins: 25,
            streakBonus: {
                3: 10,
                7: 25,
                14: 50,
                30: 100
            }
        }
    }
};
