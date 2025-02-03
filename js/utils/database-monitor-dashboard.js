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
