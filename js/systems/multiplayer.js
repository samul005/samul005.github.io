export class MultiplayerSystem {
    constructor() {
        this.currentMatch = null;
        this.matchmakingQueue = [];
        this.activeSessions = new Map();
        this.maxQueueTime = 30000; // 30 seconds
    }

    async startLocalMatch(player1, player2) {
        try {
            const match = {
                id: this.generateMatchId(),
                players: [player1, player2],
                mode: 'local',
                currentTurn: 0,
                word: await this.getRandomWord(),
                guessedLetters: new Set(),
                scores: { [player1.id]: 0, [player2.id]: 0 }
            };

            this.currentMatch = match;
            return match;
        } catch (error) {
            console.error('Failed to start local match:', error);
            throw error;
        }
    }

    async findOnlineMatch(player) {
        try {
            // Add to queue
            const queueEntry = {
                player,
                timestamp: Date.now(),
                skill: player.skillRating
            };
            
            this.matchmakingQueue.push(queueEntry);

            // Find match with similar skill
            const match = await this.findMatchingPlayer(queueEntry);
            if (match) {
                await this.createOnlineMatch(match);
                return match;
            }

            // Check queue timeout
            if (Date.now() - queueEntry.timestamp > this.maxQueueTime) {
                this.matchmakingQueue = this.matchmakingQueue.filter(
                    entry => entry.player.id !== player.id
                );
                throw new Error('Matchmaking timeout');
            }

            return null;
        } catch (error) {
            console.error('Matchmaking failed:', error);
            throw error;
        }
    }

    async findMatchingPlayer(entry) {
        const skillRange = 100;
        return this.matchmakingQueue.find(other => 
            other.player.id !== entry.player.id &&
            Math.abs(other.player.skillRating - entry.player.skillRating) <= skillRange
        );
    }

    async createOnlineMatch(matchedPlayers) {
        const match = {
            id: this.generateMatchId(),
            players: matchedPlayers,
            mode: 'online',
            state: 'starting',
            timestamp: Date.now()
        };

        // Remove players from queue
        this.matchmakingQueue = this.matchmakingQueue.filter(
            entry => !matchedPlayers.includes(entry.player)
        );

        this.activeSessions.set(match.id, match);
        return match;
    }

    generateMatchId() {
        return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}