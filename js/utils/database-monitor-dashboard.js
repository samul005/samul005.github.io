class DatabaseMonitorDashboard {
    constructor() {
        this.timestamp = "2025-02-02 04:58:00";
        this.currentUser = "samul005";
        this.monitor = new DatabaseMonitor();
        
        this.charts = {};
        this.updateInterval = 5000; // 5 seconds

        this.initializeDashboard();
    }

    async initializeDashboard() {
        // Initialize charts
        this.initializeCharts();

        // Start real-time updates
        this.startRealtimeUpdates();

        // Load initial data
        await this.loadDashboardData();
    }

    initializeCharts() {
        // Query Performance Chart
        this.charts.queryPerformance = new Chart(
            document.getElementById('queryPerformanceChart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Average Query Time (ms)',
                        data: [],
                        borderColor: '#3498db'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );

        // Error Rate Chart
        this.charts.errorRate = new Chart(
            document.getElementById('errorRateChart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Error Rate (%)',
                        data: [],
                        borderColor: '#e74c3c'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );

        // Collection Usage Chart
        this.charts.collectionUsage = new Chart(
            document.getElementById('collectionUsageChart'),
            {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Query Count',
                        data: [],
                        backgroundColor: '#2ecc71'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }

    startRealtimeUpdates() {
        setInterval(() => this.updateDashboard(), this.updateInterval);
    }

    async loadDashboardData() {
        try {
            const data = await this.fetchMonitoringData();
            this.updateDashboardMetrics(data);
            this.updateCharts(data);
            this.updateAlerts(data.alerts);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async fetchMonitoringData() {
        // Implement data fetching from DatabaseMonitor
        return {
            queryMetrics: Array.from(this.monitor.metrics.queries.entries()),
            errorMetrics: Array.from(this.monitor.metrics.errors.entries()),
            alerts: await this.fetchRecentAlerts()
        };
    }

    updateDashboardMetrics(data) {
        // Update summary metrics
        document.getElementById('totalQueries').textContent = 
            this.monitor.calculateTotalQueries();
        document.getElementById('avgQueryTime').textContent = 
            this.monitor.calculateAverageQueryTime().toFixed(2) + 'ms';
        document.getElementById('errorRate').textContent = 
            (this.monitor.calculateErrorRate() * 100).toFixed(2) + '%';
        document.getElementById('slowQueryRate').textContent = 
            (this.monitor.calculateSlowQueryRate() * 100).toFixed(2) + '%';
    }

    updateCharts(data) {
        // Update Query Performance Chart
        this.updateQueryPerformanceChart(data.queryMetrics);

        // Update Error Rate Chart
        this.updateErrorRateChart(data.errorMetrics);

        // Update Collection Usage Chart
        this.updateCollectionUsageChart(data.queryMetrics);
    }

    updateQueryPerformanceChart(queryMetrics) {
        const chart = this.charts.queryPerformance;
        const timestamps = this.getLast24Hours();
        
        chart.data.labels = timestamps;
        chart.data.datasets[0].data = queryMetrics.map(([_, stats]) => 
            stats.totalDuration / stats.count);
        
        chart.update();
    }

    updateErrorRateChart(errorMetrics) {
        const chart = this.charts.errorRate;
        const timestamps = this.getLast24Hours();
        
        chart.data.labels = timestamps;
        chart.data.datasets[0].data = errorMetrics.map(([_, stats]) => 
            stats.count);
        
        chart.update();
    }

    updateCollectionUsageChart(queryMetrics) {
        const chart = this.charts.collectionUsage;
        
        chart.data.labels = queryMetrics.map(([collection, _]) => collection);
        chart.data.datasets[0].data = queryMetrics.map(([_, stats]) => 
            stats.count);
        
        chart.update();
    }

    async updateAlerts(alerts) {
        const alertsContainer = document.getElementById('alertsContainer');
        
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert alert-${alert.type}">
                <h4>${alert.message}</h4>
                <p>Triggered at: ${new Date(alert.timestamp).toLocaleString()}</p>
                ${alert.status === 'new' ? '<span class="badge">New</span>' : ''}
            </div>
        `).join('');
    }

    async fetchRecentAlerts() {
        const snapshot = await this.monitor.db.collection('alerts')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        return snapshot.docs.map(doc => doc.data());
        getLast24Hours() {
        const hours = [];
        for (let i = 23; i >= 0; i--) {
            const date = new Date();
            date.setHours(date.getHours() - i);
            hours.push(date.toLocaleTimeString());
        }
        return hours;
    }

    async exportMonitoringData() {
        try {
            const data = await this.fetchMonitoringData();
            const exportData = {
                timestamp: "2025-02-02 05:15:07",
                exportedBy: "samul005",
                metrics: {
                    queries: Object.fromEntries(data.queryMetrics),
                    errors: Object.fromEntries(data.errorMetrics)
                },
                summary: {
                    totalQueries: this.monitor.calculateTotalQueries(),
                    averageQueryTime: this.monitor.calculateAverageQueryTime(),
                    errorRate: this.monitor.calculateErrorRate(),
                    slowQueryRate: this.monitor.calculateSlowQueryRate()
                },
                alerts: data.alerts
            };

            // Convert to CSV
            const csv = this.convertToCSV(exportData);
            this.downloadCSV(csv, `database-metrics-${this.timestamp}.csv`);
        } catch (error) {
            console.error('Error exporting monitoring data:', error);
        }
    }

    convertToCSV(data) {
        const rows = [
            // Headers
            ['Metric', 'Value', 'Timestamp'],
            
            // Summary metrics
            ['Total Queries', data.summary.totalQueries, this.timestamp],
            ['Average Query Time (ms)', data.summary.averageQueryTime.toFixed(2), this.timestamp],
            ['Error Rate (%)', (data.summary.errorRate * 100).toFixed(2), this.timestamp],
            ['Slow Query Rate (%)', (data.summary.slowQueryRate * 100).toFixed(2), this.timestamp],
            
            // Separator
            [],
            ['Collection', 'Query Count', 'Average Duration', 'Slow Queries'],
            
            // Query metrics
            ...Object.entries(data.metrics.queries).map(([collection, stats]) => [
                collection,
                stats.count,
                (stats.totalDuration / stats.count).toFixed(2),
                stats.slowQueries
            ]),
            
            // Separator
            [],
            ['Error Type', 'Count', 'First Seen', 'Last Seen'],
            
            // Error metrics
            ...Object.entries(data.metrics.errors).map(([type, stats]) => [
                type,
                stats.count,
                stats.firstSeen,
                stats.lastSeen
            ])
        ];

        return rows.map(row => row.join(',')).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    createAlertRule() {
        const form = document.getElementById('alertRuleForm');
        const rule = {
            metric: form.metric.value,
            condition: form.condition.value,
            threshold: parseFloat(form.threshold.value),
            interval: parseInt(form.interval.value),
            notifications: {
                email: form.emailNotification.checked,
                slack: form.slackNotification.checked
            },
            created: this.timestamp,
            createdBy: this.currentUser,
            enabled: true
        };

        this.saveAlertRule(rule);
    }

    async saveAlertRule(rule) {
        try {
            await this.monitor.db.collection('alert_rules').add(rule);
            this.showNotification('Alert rule created successfully', 'success');
            this.loadAlertRules();
        } catch (error) {
            console.error('Error saving alert rule:', error);
            this.showNotification('Error creating alert rule', 'error');
        }
    }

    async loadAlertRules() {
        try {
            const snapshot = await this.monitor.db.collection('alert_rules')
                .where('enabled', '==', true)
                .get();

            const rulesContainer = document.getElementById('alertRulesContainer');
            rulesContainer.innerHTML = snapshot.docs.map(doc => `
                <div class="alert-rule" data-id="${doc.id}">
                    <div class="rule-header">
                        <h4>${doc.data().metric}</h4>
                        <div class="rule-actions">
                            <button onclick="editRule('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteRule('${doc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p>Condition: ${doc.data().condition} ${doc.data().threshold}</p>
                    <p>Check Interval: ${doc.data().interval} minutes</p>
                    <p>Created: ${doc.data().created}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading alert rules:', error);
        }
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

    async generateReport(reportType) {
        try {
            let reportData;
            switch (reportType) {
                case 'daily':
                    reportData = await this.generateDailyReport();
                    break;
                case 'weekly':
                    reportData = await this.generateWeeklyReport();
                    break;
                case 'monthly':
                    reportData = await this.generateMonthlyReport();
                    break;
                default:
                    throw new Error('Invalid report type');
            }

            // Create report document
            const report = {
                type: reportType,
                data: reportData,
                generated: this.timestamp,
                generatedBy: this.currentUser
            };

            await this.monitor.db.collection('reports').add(report);
            this.showNotification(`${reportType} report generated successfully`, 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showNotification(`Error generating ${reportType} report`, 'error');
        }
    }

    async generateDailyReport() {
        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        return this.aggregateMetrics(startTime);
    }

    async generateWeeklyReport() {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 7);
        
        return this.aggregateMetrics(startTime);
    }

    async generateMonthlyReport() {
        const startTime = new Date();
        startTime.setMonth(startTime.getMonth() - 1);
        
        return this.aggregateMetrics(startTime);
    }

    async aggregateMetrics(startTime) {
        const snapshot = await this.monitor.db.collection('monitoring_reports')
            .where('timestamp', '>=', startTime.toISOString())
            .get();

        return snapshot.docs.reduce((acc, doc) => {
            const data = doc.data();
            return {
                totalQueries: acc.totalQueries + data.summary.totalQueries,
                averageQueryTime: acc.averageQueryTime + data.summary.averageQueryTime,
                errorCount: acc.errorCount + Object.values(data.metrics.errors)
                    .reduce((sum, { count }) => sum + count, 0),
                slowQueryCount: acc.slowQueryCount + Object.values(data.metrics.queries)
                    .reduce((sum, { slowQueries }) => sum + slowQueries, 0)
            };
        }, {
            totalQueries: 0,
            averageQueryTime: 0,
            errorCount: 0,
            slowQueryCount: 0
        });
    }
}

// Initialize dashboard when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dbMonitorDashboard = new DatabaseMonitorDashboard();
});

// Export dashboard instance for global access
export { DatabaseMonitorDashboard };
