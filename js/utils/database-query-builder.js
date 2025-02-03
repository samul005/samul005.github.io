class QueryBuilder {
    constructor() {
        this.timestamp = "2025-02-02 04:55:09";
        this.currentUser = "samul005";
        
        this.reset();
    }

    reset() {
        this.collection = null;
        this.filters = [];
        this.orderByParams = [];
        this.limitValue = null;
        this.offsetValue = null;
        this.selectFields = [];
        return this;
    }

    from(collection) {
        this.collection = collection;
        return this;
    }

    where(field, operator, value) {
        this.filters.push({ field, operator, value });
        return this;
    }

    orderBy(field, direction = 'asc') {
        this.orderByParams.push({ field, direction });
        return this;
    }

    limit(value) {
        this.limitValue = value;
        return this;
    }

    offset(value) {
        this.offsetValue = value;
        return this;
    }

    select(...fields) {
        this.selectFields = fields;
        return this;
    }

    build() {
        if (!this.collection) {
            throw new Error('Collection must be specified');
        }

        return {
            collection: this.collection,
            filters: this.filters,
            orderBy: this.orderByParams,
            limit: this.limitValue,
            offset: this.offsetValue,
            select: this.selectFields
        };
    }

    // Convenience methods for common queries
    static createUserQuery(userId) {
        return new QueryBuilder()
            .from('users')
            .where('uid', '==', userId)
            .build();
    }

    static createLeaderboardQuery(gameMode, limit = 10) {
        return new QueryBuilder()
            .from('leaderboards')
            .where('mode', '==', gameMode)
            .orderBy('score', 'desc')
            .limit(limit)
            .build();
    }

    static createRecentGamesQuery(userId, limit = 5) {
        return new QueryBuilder()
            .from('games')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .build();
    }

    static createActiveUsersQuery(minutes = 15) {
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);

        return new QueryBuilder()
            .from('users')
            .where('lastActive', '>=', cutoffTime.toISOString())
            .build();
    }
}

export { QueryBuilder };
