export class RewardsUI {
    constructor(rewardSystem) {
        this.rewardSystem = rewardSystem;
        this.setupUI();
    }

    setupUI() {
        const rewardsButton = document.createElement('div');
        rewardsButton.className = 'rewards-button';
        rewardsButton.innerHTML = `
            <div class="rewards-icon">🎁</div>
            <div class="rewards-tooltip">
                <span class="next-reward" id="nextReward">Ready to claim!</span>
                <div class="streak-info" id="streakInfo"></div>
            </div>
        `;
        document.body.appendChild(rewardsButton);

        rewardsButton.addEventListener('click', () => this.showRewardsModal());
    }

    async showRewardsModal() {
        const modal = document.createElement('div');
        modal.className = 'rewards-modal';
        modal.innerHTML = `
            <div class="rewards-content">
                <h2>Daily Rewards</h2>
                <div class="streak-display">
                    <span class="streak-count" id="streakCount"></span>
                    <div class="streak-progress" id="streakProgress"></div>
                </div>
                <div class="rewards-grid" id="rewardsGrid"></div>
                <button class="claim-button" id="claimButton">Claim Reward</button>
            </div>
        `;
        document.body.appendChild(modal);

        this.updateRewardsDisplay();
    }

    async updateRewardsDisplay() {
        const reward = await this.rewardSystem.checkDailyReward(userId);
        const streakCount = document.getElementById('streakCount');
        const streakProgress = document.getElementById('streakProgress');
        const claimButton = document.getElementById('claimButton');

        if (reward.canClaim) {
            claimButton.disabled = false;
            claimButton.textContent = 'Claim Reward';
            this.showRewardPreview(reward);
        } else {
            claimButton.disabled = true;
            claimButton.textContent = this.formatNextClaimTime(reward.nextClaimTime);
        }

        // Update streak display
        streakCount.textContent = `${reward.streak} Day Streak!`;
        this.updateStreakProgress(streakProgress, reward.streak);
    }

    formatNextClaimTime(nextTime) {
        const now = new Date();
        const hours = Math.floor((nextTime - now) / 3600000);
        const minutes = Math.floor(((nextTime - now) % 3600000) / 60000);
        return `Next reward in ${hours}h ${minutes}m`;
    }

    showRewardPreview(reward) {
        const rewardsGrid = document.getElementById('rewardsGrid');
        rewardsGrid.innerHTML = `
            <div class="reward-item">
                <div class="reward-icon">🌀</div>
                <div class="reward-amount">${reward.coins}</div>
            </div>
            ${reward.powerUp ? `
                <div class="reward-item">
                    <div class="reward-icon">🎁</div>
                    <div class="reward-label">Mystery Power-up</div>
                </div>
            ` : ''}
        `;
    }
}
