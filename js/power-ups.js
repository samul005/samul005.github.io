// power-ups.js
class PowerUpSystem {
    constructor() {
        this.timestamp = "2025-02-03 03:56:49";
        this.currentUser = "samul005";
        
        // Initialize power-up collections
        this.powerUps = new Map();
        this.activeEffects = new Map();
        
        // Configuration
        this.config = {
            maxActivePowerUps: 3,
            stackingLimit: 2,
            baseSpawnRate: 0.05,
            defaultDuration: 10000, // 10 seconds
            cooldownPeriod: 3000    // 3 seconds
        };

        // Initialize categories
        this.initializePowerUps();
        
        // Start update loop
        this.startUpdateLoop();
    }

    initializePowerUps() {
        // Speed boost
        this.registerPowerUp({
            id: 'speed_boost',
            name: 'Speed Boost',
            category: 'boost',
            duration: 5000,
            multiplier: 1.5,
            stackable: true,
            maxStack: 2,
            rarity: 'common',
            onActivate: (player) => {
                player.speed *= this.multiplier;
            },
            onDeactivate: (player) => {
                player.speed /= this.multiplier;
            }
        });

        // Time freeze
        this.registerPowerUp({
            id: 'time_freeze',
            name: 'Time Freeze',
            category: 'special',
            duration: 3000,
            stackable: false,
            rarity: 'rare',
            onActivate: (gameState) => {
                gameState.timeScale = 0;
            },
            onDeactivate: (gameState) => {
                gameState.timeScale = 1;
            }
        });

        // Additional power-ups...
    }

    registerPowerUp(powerUpData) {
        this.powerUps.set(powerUpData.id, {
            ...powerUpData,
            instances: [],
            cooldown: 0
        });
    }

    async activatePowerUp(powerUpId, target) {
        try {
            const powerUp = this.powerUps.get(powerUpId);
            
            if (!powerUp) {
                throw new Error(`Power-up ${powerUpId} not found`);
            }

            // Check cooldown
            if (powerUp.cooldown > Date.now()) {
                throw new Error('Power-up is on cooldown');
            }

            // Check stacking
            if (!this.canStack(powerUpId)) {
                throw new Error('Cannot stack more of this power-up');
            }

            // Create instance
            const instance = {
                id: `${powerUpId}_${Date.now()}`,
                startTime: Date.now(),
                endTime: Date.now() + powerUp.duration,
                target
            };

            // Store active instance
            powerUp.instances.push(instance);
            
            // Apply effect
            powerUp.onActivate(target);

            // Set cooldown
            powerUp.cooldown = Date.now() + this.config.cooldownPeriod;

            // Log activation
            await this.logPowerUpEvent('activate', powerUpId, target);

            return instance;
        } catch (error) {
            await this.logPowerUpError(error, powerUpId);
            throw error;
        }
    }

    async deactivatePowerUp(powerUpId, instanceId) {
        try {
            const powerUp = this.powerUps.get(powerUpId);
            const instanceIndex = powerUp.instances.findIndex(i => i.id === instanceId);

            if (instanceIndex === -1) {
                throw new Error('Power-up instance not found');
            }

            const instance = powerUp.instances[instanceIndex];

            // Remove instance
            powerUp.instances.splice(instanceIndex, 1);

            // Remove effect
            powerUp.onDeactivate(instance.target);

            // Log deactivation
            await this.logPowerUpEvent('deactivate', powerUpId, instance.target);

        } catch (error) {
            await this.logPowerUpError(error, powerUpId);
            throw error;
        }
    }

    canStack(powerUpId) {
        const powerUp = this.powerUps.get(powerUpId);
        
        if (!powerUp.stackable) {
            return powerUp.instances.length === 0;
        }

        return powerUp.instances.length < powerUp.maxStack;
    }

    startUpdateLoop() {
        setInterval(() => this.update(), 100); // Update every 100ms
    }

    update() {
        const now = Date.now();

        // Check all active power-ups
        for (const [powerUpId, powerUp] of this.powerUps) {
            // Filter expired instances
            const expired = powerUp.instances.filter(
                instance => now >= instance.endTime
            );

            // Deactivate expired instances
            expired.forEach(instance => {
                this.deactivatePowerUp(powerUpId, instance.id);
            });
        }
    }

    async spawnPowerUp(position, excludeTypes = []) {
        try {
            // Filter available power-ups
            const available = Array.from(this.powerUps.values())
                .filter(p => !excludeTypes.includes(p.id));

            // Apply rarity weights
            const weighted = this.applyRarityWeights(available);

            // Select random power-up
            const selected = this.selectRandomPowerUp(weighted);

            // Create spawn data
            const spawnData = {
                id: selected.id,
                position,
                timestamp: Date.now()
            };

            // Log spawn
            await this.logPowerUpEvent('spawn', selected.id, position);

            return spawnData;
        } catch (error) {
            await this.logPowerUpError(error);
            throw error;
        }
    }

    applyRarityWeights(powerUps) {
        const rarityWeights = {
            common: 100,
            uncommon: 60,
            rare: 30,
            epic: 10,
            legendary: 1
        };

        return powerUps.map(powerUp => ({
            ...powerUp,
            weight: rarityWeights[powerUp.rarity] || 1
        }));
    }

    selectRandomPowerUp(weightedPowerUps) {
        const totalWeight = weightedPowerUps.reduce(
            (sum, p) => sum + p.weight, 
            0
        );

        let random = Math.random() * totalWeight;

        for (const powerUp of weightedPowerUps) {
            random -= powerUp.weight;
            if (random <= 0) {
                return powerUp;
            }
        }

        return weightedPowerUps[0];
    }

    // Analytics and Logging
    async logPowerUpEvent(type, powerUpId, target) {
        const event = {
            type,
            powerUpId,
            target,
            timestamp: this.timestamp,
            user: this.currentUser
        };

        // Log to database or analytics service
        console.log('Power-up event:', event);
    }

    async logPowerUpError(error, powerUpId = null) {
        const errorLog = {
            error: error.message,
            stack: error.stack,
            powerUpId,
            timestamp: this.timestamp,
            user: this.currentUser
        };

        // Log to error tracking service
        console.error('Power-up error:', errorLog);
    }

    // Utility methods
    getPowerUpInfo(powerUpId) {
        return this.powerUps.get(powerUpId);
    }

    getActivePowerUps() {
        const active = [];
        for (const [id, powerUp] of this.powerUps) {
            if (powerUp.instances.length > 0) {
                active.push({
                    id,
                    instances: powerUp.instances
                });
            }
        }
        return active;
    }

    clearAllPowerUps() {
        for (const [powerUpId, powerUp] of this.powerUps) {
            powerUp.instances.forEach(instance => {
                this.deactivatePowerUp(powerUpId, instance.id);
            });
        }
    }
}

// Export the PowerUpSystem class
export { PowerUpSystem };
