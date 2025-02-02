import { DatabaseManager } from '../../js/utils.js';

class AdminDashboard {
    constructor() {
        this.timestamp = "2025-02-02 04:28:00";
        this.currentUser = "samul005";
        this.dbManager = new DatabaseManager();
        
        this.charts = {};
        this.currentPage = 1;
        this.usersPerPage = 10;
        
        this.initializeAdmin();
    }

    async initializeAdmin() {
        // Verify admin access
        if (!await this.verifyAdminAccess()) {
            window.location.href = '../index.html';
            return;
        }

        // Initialize UI components
        this.setupNavigation();
        this.loadDashboardData();
        this.setupEventListeners();
    }

    async verifyAdminAccess() {
        try {
            const userData = await this.dbManager.getUserData(this.currentUser);
            return userData.role === 'admin';
        } catch (error) {
            console.error('Error verifying admin access:', error);
            return false;
        }
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-item').dataset.section;
                this.switchSection(section);
            });
        });
    }

    switchSection(sectionId) {
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Show selected section
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });

        // Load section specific data
        switch (sectionId) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'questions':
                this.loadQuestions();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const stats = await this.dbManager.getGameStats();
            
            // Update stat cards
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalGames').textContent = stats.totalGames;
            document.getElementById('totalCoins').textContent = stats.totalCoins;
            document.getElementById('totalTransactions').textContent = 
                stats.totalTransactions;

            // Initialize charts
            this.initializeCharts(stats);
            
            // Load recent activity
            this.loadRecentActivity();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    initializeCharts(stats) {
        // User Activity Chart
        this.charts.userActivity = new Chart(
            document.getElementById('userActivityChart'),
            {
                type: 'line',
                data: {
                    labels: stats.activityDates,
                    datasets: [{
                        label: 'Active Users',
                        data: stats.activeUsers,
                        borderColor: '#87CEEB',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );

        // Game Mode Distribution Chart
        this.charts.gameMode = new Chart(
            document.getElementById('gameModeChart'),
            {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.modeDistribution),
                    datasets: [{
                        data: Object.values(stats.modeDistribution),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }

    async loadRecentActivity() {
        try {
            const activity = await this.dbManager.getRecentActivity();
            const activityList = document.getElementById('recentActivity');
            
            activityList.innerHTML = activity.map(item => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${this.getActivityIcon(item.type)}"></i>
                    </div>
                    <div class="activity-details">
                        <p>${item.description}</p>
                        <span class="activity-time">
                            ${this.formatTimestamp(item.timestamp)}
                        </span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    getActivityIcon(type) {
        const icons = {
            'game': 'fa-gamepad',
            'purchase': 'fa-shopping-cart',
            'achievement': 'fa-trophy',
            'login': 'fa-sign-in-alt'
        };
        return icons[type] || 'fa-circle';
    }

    async loadUsers(page = 1) {
        try {
            const { users, total } = await this.dbManager.getUsers(
                page, 
                this.usersPerPage
            );
            
            const tableBody = document.getElementById('usersTableBody');
            tableBody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.level}</td>
                    <td>${user.gamesPlayed}</td>
                    <td>${user.coins}</td>
                    <td>
                        <span class="status-badge ${user.status}">
                            ${user.status}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn small" 
                                onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" 
                                onclick="banUser('${user.id}')">
                            <i class="fas fa-ban"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            // Update pagination
            this.updatePagination(page, total);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadQuestions() {
        try {
            const questions = await this.dbManager.getQuestions();
            const questionsGrid = document.getElementById('questionsGrid');
            
            questionsGrid.innerHTML = questions.map(question => `
                <div class="question-card">
                    <div class="question-header">
                        <span class="category-badge">${question.category}</span>
                        <span class="difficulty-badge ${question.difficulty}">
                            ${question.difficulty}
                        </span>
                    </div>
                    <p class="question-text">${question.question}</p>
                    <p class="question-answer">Answer: ${question.answer}</p>
                    <div class="question-actions">
                        <button class="action-btn small" 
                                onclick="editQuestion('${question.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" 
                                onclick="deleteQuestion('${question.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    }

    async loadReports() {
        try {
            const reportData = await this.dbManager.getReportData();
            
            // User Growth Chart
            this.charts.userGrowth = new Chart(
                document.getElementById('userGrowthChart'),
                {
                    type: 'line',
                    data: {
                        labels: reportData.dates,
                        datasets: [{
                            label: 'New Users',
                            data: reportData.newUsers,
                            borderColor: '#2ecc71',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );

            // Revenue Chart
            this.charts.revenue = new Chart(
                document.getElementById('revenueChart'),
                {
                    type: 'bar',
                    data: {
                        labels: reportData.months,
                        datasets: [{
                            label: 'Revenue',
                            data: reportData.revenue,
                            backgroundColor: '#3498db'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );

            // Game Stats Chart
            this.charts.gameStats = new Chart(
                document.getElementById('gameStatsChart'),
                {
                    type: 'radar',
                    data: {
                        labels: ['Classic', 'Time Challenge', 'Lion Mode', 
                                'Endless', 'Extreme'],
                        datasets: [{
                            label: 'Win Rate %',
                            data: reportData.winRates,
                            backgroundColor: 'rgba(135, 206, 235, 0.2)',
                            borderColor: '#87CEEB'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    async loadSettings() {
        try {
            const settings = await this.dbManager.getGameSettings();
            
            // Update form values
            document.getElementById('defaultLives').value = settings.defaultLives;
            document.getElementById('timeLimit').value = settings.timeLimit;
            document.getElementById('coinLimit').value = settings.coinLimit;
            document.getElementById('powerupCost').value = settings.powerupCost;
            document.getElementById('maintenanceMode').checked = 
                settings.maintenanceMode;
            document.getElementById('autoBackup').checked = settings.autoBackup;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupEventListeners() {
        // User search
        document.getElementById('userSearch').addEventListener('input', 
            debounce((e) => this.searchUsers(e.target.value), 300));

        // Export users
        document.getElementById('exportUsers').addEventListener('click', 
            () => this.exportUsers());

        // Question form
        document.getElementById('questionForm').addEventListener('submit', 
            (e) => this.handleQuestionSubmit(e));

        // Settings form
        document.querySelectorAll('.settings-card input, .settings-card select')
            .forEach(input => {
                input.addEventListener('change', 
                    () => this.saveSettings());
            });
    }

    async searchUsers(query) {
        try {
            const users = await this.dbManager.searchUsers(query);
            this.updateUsersTable(users);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    async exportUsers() {
        try {
            const users = await this.dbManager.getAllUsers();
            const csv = this.convertToCSV(users);
            this.downloadCSV(csv, 'users_export.csv');
        } catch (error) {
            console.error('Error exporting users:', error);
        }
    }

    async handleQuestionSubmit(e) {
        e.preventDefault();
        
        const questionData = {
            category: document.getElementById('questionCategory').value,
            question: document.getElementById('questionText').value,
            answer: document.getElementById('questionAnswer').value,
            difficulty: document.getElementById('questionDifficulty').value,
            timestamp: this.timestamp,
            addedBy: this.currentUser
        };

        try {
            await this.dbManager.addQuestion(questionData);
            this.closeModal('questionModal');
            this.loadQuestions();
        } catch (error) {
            console.error('Error adding question:', error);
        }
    }

    async saveSettings() {
        const settings = {
            defaultLives: parseInt(document.getElementById('defaultLives').value),
            timeLimit: parseInt(document.getElementById('timeLimit').value),
            coinLimit: parseInt(document.getElementById('coinLimit').value),
            powerupCost: parseInt(document.getElementById('powerupCost').value),
            maintenanceMode: document.getElementById('maintenanceMode').checked,
            autoBackup: document.getElementById('autoBackup').checked,
            lastUpdated: this.timestamp,
            updatedBy: this.currentUser
        };

        try {
            await this.dbManager.updateGameSettings(settings);
            this.showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    // Utility Functions
    updatePagination(currentPage, total) {
        const totalPages = Math.ceil(total / this.usersPerPage);
        const pagination = document.getElementById('usersPagination');
        
        pagination.innerHTML = `
            <button class="page-btn" 
                    ${currentPage === 1 ? 'disabled' : ''}
                    onclick="loadUsers(1)">
                First
            </button>
            <button class="page-btn" 
                    ${currentPage === 1 ? 'disabled' : ''}
                    onclick="loadUsers(${currentPage - 1})">
                Previous
            </button>
            <span class="page-info">
                Page ${currentPage} of ${totalPages}
            </span>
            <button class="page-btn" 
                    ${currentPage === totalPages ? 'disabled' : ''}
                    onclick="loadUsers(${currentPage + 1})">
                Next
            </button>
            <button class="page-btn" 
                    ${currentPage === totalPages ? 'disabled' : ''}
                    onclick="loadUsers(${totalPages})">
                Last
            </button>
        `;
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    convertToCSV(data) {
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(header => obj[header]));
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize admin dashboard when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

// Export functions for global access
window.editUser = (userId) => {
    // Implement user edit functionality
};

window.banUser = (userId) => {
    // Implement user ban functionality
};

window.editQuestion = (questionId) => {
    // Implement question edit functionality
};

window.deleteQuestion = (questionId) => {
    // Implement question delete functionality
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
};
