export const StoreItems = {
    powerUps: {
        hint: {
            id: 'hint',
            name: 'Extra Hint',
            description: 'Get 1 free letter revealed',
            icon: '🔡',
            price: 25,
            type: 'consumable'
        },
        timeBoost: {
            id: 'timeBoost',
            name: 'Extra Time',
            description: 'Gain +30 seconds in Time Challenge',
            icon: '⏱️',
            price: 50,
            type: 'consumable'
        },
        skipWord: {
            id: 'skipWord',
            name: 'Skip Word',
            description: 'Skip a word without losing lives',
            icon: '⏭️',
            price: 60,
            type: 'consumable'
        },
        shield: {
            id: 'shield',
            name: 'Shield',
            description: 'Prevent 1 wrong guess penalty',
            icon: '🛡️',
            price: 75,
            type: 'consumable'
        },
        doubleCoins: {
            id: 'doubleCoins',
            name: 'Double Coins',
            description: 'Earn 2x coins for next round',
            icon: '💰',
            price: 75,
            type: 'consumable'
        }
    },

    themes: {
        classic: {
            id: 'classic',
            name: 'Classic',
            description: 'Default theme',
            preview: 'theme-classic.png',
            price: 0,
            type: 'theme'
        },
        neonDark: {
            id: 'neonDark',
            name: 'Neon Dark',
            description: 'Glowing futuristic design',
            preview: 'theme-neon.png',
            price: 150,
            type: 'theme'
        },
        wooden: {
            id: 'wooden',
            name: 'Wooden',
            description: 'Vintage wooden board style',
            preview: 'theme-wooden.png',
            price: 200,
            type: 'theme'
        },
        space: {
            id: 'space',
            name: 'Space',
            description: 'Galactic theme with stars',
            preview: 'theme-space.png',
            price: 250,
            type: 'theme'
        },
        cyberpunk: {
            id: 'cyberpunk',
            name: 'Cyberpunk',
            description: 'Futuristic neon colors',
            preview: 'theme-cyber.png',
            price: 300,
            type: 'theme'
        }
    },

    avatars: {
        default1: {
            id: 'default1',
            name: 'Default 1',
            image: 'avatar-default1.png',
            price: 0,
            type: 'avatar'
        },
        default2: {
            id: 'default2',
            name: 'Default 2',
            image: 'avatar-default2.png',
            price: 0,
            type: 'avatar'
        },
        warrior: {
            id: 'warrior',
            name: 'Warrior',
            image: 'avatar-warrior.png',
            price: 100,
            requiredLevel: 10,
            type: 'avatar'
        },
        ninja: {
            id: 'ninja',
            name: 'Ninja',
            image: 'avatar-ninja.png',
            price: 150,
            requiredLevel: 25,
            type: 'avatar'
        },
        astronaut: {
            id: 'astronaut',
            name: 'Astronaut',
            image: 'avatar-astronaut.png',
            price: 200,
            requiredLevel: 35,
            type: 'avatar'
        },
        samurai: {
            id: 'samurai',
            name: 'Samurai',
            image: 'avatar-samurai.png',
            price: 300,
            requiredLevel: 50,
            type: 'avatar'
        }
    }
};
