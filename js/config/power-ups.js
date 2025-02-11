export const PowerUpTypes = {
    SECOND_CHANCE: {
        id: 'second_chance',
        name: 'Second Chance',
        icon: '🔄',
        description: 'Get one extra life after losing',
        price: 80,
        animation: 'pulse',
        effect: 'resurrect'
    },
    REVEAL_LETTER: {
        id: 'reveal_letter',
        name: 'Reveal Letter',
        icon: '🕵️',
        description: 'Automatically reveal a correct letter',
        price: 50,
        animation: 'sparkle',
        effect: 'reveal'
    },
    EXTRA_HINT: {
        id: 'extra_hint',
        name: 'Extra Hint',
        icon: '💡',
        description: 'Unlock additional hints',
        price: 40,
        animation: 'glow',
        effect: 'hint'
    },
    TIME_BOOST: {
        id: 'time_boost',
        name: 'Time Boost',
        icon: '⏳',
        description: 'Add 30 seconds to the timer',
        price: 60,
        animation: 'clock',
        effect: 'time'
    },
    SHIELD: {
        id: 'shield',
        name: 'Shield',
        icon: '🛡️',
        description: 'Protect against one wrong guess',
        price: 70,
        animation: 'shield',
        effect: 'protect'
    }
};
