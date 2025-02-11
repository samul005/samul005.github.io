export const GameModes = {
    classic: {
        lives: 6,
        timeLimit: null,
        scoreMultiplier: 1,
        hints: 3,
        description: {
            wordLength: 'Any',
            difficulty: 'Normal',
            special: 'Classic hangman rules'
        }
    },
    time: {
        simple: {
            lives: 6,
            timeLimit: 300,
            scoreMultiplier: 1.2,
            hints: 3,
            wordLength: '3-6 letters'
        },
        normal: {
            lives: 6,
            timeLimit: 120,
            scoreMultiplier: 1.5,
            hints: 2,
            wordLength: '4-8 letters'
        },
        hard: {
            lives: 6,
            timeLimit: 60,
            scoreMultiplier: 2,
            hints: 1,
            wordLength: '5-12 letters'
        }
    },
    endless: {
        lives: 6,
        timeLimit: null,
        scoreMultiplier: 1.2,
        hints: 3,
        streakBonus: true,
        description: {
            special: 'Lives restore +1 every 3 words'
        }
    },
    lion: {
        lives: 6,
        timeLimit: null,
        scoreMultiplier: 1.5,
        hints: 2,
        wordLength: 4,
        description: {
            special: '4-letter words only'
        }
    },
    extreme: {
        lives: 5,
        timeLimit: 90,
        scoreMultiplier: 3,
        hints: 1,
        description: {
            special: 'Hard words, fewer lives, time pressure'
        }
    }
};
