/**
 * Professional Dashboard UI Manager
 * Enhances the existing dashboard with professional styling and features
 */
class ProfessionalDashboard {
    constructor() {
        this.isInitialized = false;

        // Initialize immediately since we're called after other components
        this.initialize();
    }

    /**
     * Initialize professional enhancements
     */
    initialize() {
        try {
            console.log('Initializing professional dashboard...');

            // Check if dashboard exists
            const dashboard = document.querySelector('.dashboard');
            if (!dashboard) {
                console.warn('Dashboard not found, will retry...');
                setTimeout(() => this.initialize(), 2000);
                return;
            }

            console.log('Dashboard found, applying enhancements...');
            this.addProfessionalStyling();
            this.addDashboardHeader();
            this.enhanceExistingCards();
            this.addEventListeners();

            this.isInitialized = true;
            console.log('Professional dashboard enhancements applied successfully');
        } catch (error) {
            console.error('Failed to initialize professional dashboard:', error);
        }
    }

    /**
     * Add professional styling to existing dashboard
     */
    addProfessionalStyling() {
        try {
            const dashboard = document.querySelector('.dashboard');
            if (!dashboard) {
                console.warn('Dashboard not found, retrying in 2 seconds...');
                setTimeout(() => this.addProfessionalStyling(), 2000);
                return;
            }

            dashboard.classList.add('professional-dashboard');

            const grid = dashboard.querySelector('.dashboard__grid');
            if (grid) {
                grid.classList.add('professional-metrics-grid');
                console.log('Professional styling applied to dashboard');
            } else {
                console.warn('Dashboard grid not found');
            }
        } catch (error) {
            console.error('Error adding professional styling:', error);
        }
    }

    /**
     * Add professional dashboard header
     */
    addDashboardHeader() {
        try {
            const dashboard = document.querySelector('.dashboard');
            if (!dashboard) return;

            // Check if header already exists
            if (dashboard.querySelector('.dashboard-header')) return;

            const header = document.createElement('div');
            header.className = 'dashboard-header';
            header.innerHTML = `
                <h2 class="dashboard-title">
                    <i class="fas fa-chart-line"></i>
                    Stream Performance Metrics
                </h2>
                <div class="dashboard-controls">
                    <button class="btn btn--secondary" id="exportMetrics" title="Export Metrics">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                    <button class="btn btn--secondary" id="resetMetrics" title="Reset All Metrics">
                        <i class="fas fa-refresh"></i>
                        Reset
                    </button>
                </div>
            `;

            // Insert header at the beginning of dashboard
            const container = dashboard.querySelector('.container') || dashboard;
            container.insertBefore(header, container.firstChild);

        } catch (error) {
            console.error('Error adding dashboard header:', error);
        }
    }

    /**
     * Enhance existing cards with professional styling
     */
    enhanceExistingCards() {
        try {
            const cards = document.querySelectorAll('.dashboard .card');
            cards.forEach((card, index) => {
                // Add professional classes
                card.classList.add('metric-card');

                // Add animation delay for staggered entrance
                card.style.animationDelay = `${(index + 1) * 0.1}s`;

                // Enhance headers
                const header = card.querySelector('.card__header');
                if (header) {
                    header.classList.add('metric-card__header');

                    // Add status indicator if not present
                    if (!header.querySelector('.metric-status')) {
                        const title = header.querySelector('.card__title');
                        if (title) {
                            title.classList.add('metric-card__title');

                            const statusIndicator = document.createElement('div');
                            statusIndicator.className = 'metric-status';
                            statusIndicator.innerHTML = `
                                <span class="status-dot status-dot--good"></span>
                                Active
                            `;
                            header.appendChild(statusIndicator);
                        }
                    }
                }

                // Enhance content
                const content = card.querySelector('.card__content');
                if (content) {
                    content.classList.add('metric-card__content');

                    // Enhance info items
                    const infoItems = content.querySelectorAll('.info-item');
                    infoItems.forEach(item => {
                        const label = item.querySelector('.info-item__label');
                        const value = item.querySelector('.info-item__value');

                        if (label && value) {
                            // Add professional styling classes
                            item.classList.add('metric-item');
                            label.classList.add('metric-item__label');
                            value.classList.add('metric-item__value');
                        }
                    });
                }

                // Add panel-specific styling based on content
                this.addPanelSpecificStyling(card);
            });

        } catch (error) {
            console.error('Error enhancing existing cards:', error);
        }
    }

    /**
     * Add panel-specific styling based on card content
     */
    addPanelSpecificStyling(card) {
        try {
            const title = card.querySelector('.card__title');
            if (!title) return;

            const titleText = title.textContent.toLowerCase();

            if (titleText.includes('user information')) {
                card.classList.add('user-panel');
            } else if (titleText.includes('stream performance')) {
                card.classList.add('startup-panel');
            } else if (titleText.includes('network')) {
                card.classList.add('bitrate-panel');
            } else if (titleText.includes('error')) {
                card.classList.add('error-panel');
            }

        } catch (error) {
            console.error('Error adding panel-specific styling:', error);
        }
    }

    /**
     * Add event listeners for dashboard controls
     */
    addEventListeners() {
        try {
            const exportBtn = document.getElementById('exportMetrics');
            const resetBtn = document.getElementById('resetMetrics');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportMetrics();
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.resetMetrics();
                });
            }

        } catch (error) {
            console.error('Error adding event listeners:', error);
        }
    }

    /**
     * Export current metrics
     */
    exportMetrics() {
        try {
            const metrics = this.collectCurrentMetrics();
            const dataStr = JSON.stringify(metrics, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `hls-metrics-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Metrics exported successfully');
        } catch (error) {
            console.error('Error exporting metrics:', error);
        }
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        try {
            // Reset metric values
            const metricValues = document.querySelectorAll('.info-item__value, .metric-item__value');
            metricValues.forEach(value => {
                if (value.id !== 'browserInfo' && value.id !== 'osInfo' &&
                    value.id !== 'screenInfo' && value.id !== 'connectionInfo') {
                    value.textContent = '-';
                    value.classList.remove('threshold-good', 'threshold-warning', 'threshold-error');
                }
            });

            // Reset status indicators
            const statusDots = document.querySelectorAll('.status-dot');
            statusDots.forEach(dot => {
                dot.className = 'status-dot status-dot--waiting';
            });

            console.log('Metrics reset successfully');
        } catch (error) {
            console.error('Error resetting metrics:', error);
        }
    }

    /**
     * Collect current metrics from dashboard
     */
    collectCurrentMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                data: {}
            };

            // Collect all metric values
            const metricValues = document.querySelectorAll('.info-item__value, .metric-item__value');
            metricValues.forEach(value => {
                if (value.id) {
                    metrics.data[value.id] = value.textContent.trim();
                }
            });

            return metrics;
        } catch (error) {
            console.error('Error collecting metrics:', error);
            return { timestamp: new Date().toISOString(), data: {} };
        }
    }

    /**
     * Update metric with professional styling
     */
    updateMetric(elementId, value, thresholds = null) {
        try {
            const element = document.getElementById(elementId);
            if (!element) return;

            element.textContent = value;

            // Add update animation
            element.classList.add('metric-updated');
            setTimeout(() => {
                element.classList.remove('metric-updated');
            }, 300);

            // Apply threshold styling if provided
            if (thresholds && typeof value === 'number') {
                element.classList.remove('threshold-good', 'threshold-warning', 'threshold-error');

                if (value >= thresholds.good) {
                    element.classList.add('threshold-good');
                } else if (value >= thresholds.warning) {
                    element.classList.add('threshold-warning');
                } else {
                    element.classList.add('threshold-error');
                }
            }

        } catch (error) {
            console.error(`Error updating metric ${elementId}:`, error);
        }
    }

    /**
     * Update status indicator
     */
    updateStatus(cardSelector, status, text) {
        try {
            const card = document.querySelector(cardSelector);
            if (!card) return;

            const statusElement = card.querySelector('.metric-status');
            if (!statusElement) return;

            const dot = statusElement.querySelector('.status-dot');
            if (dot) {
                dot.className = `status-dot status-dot--${status}`;
            }

            const textNode = statusElement.childNodes[statusElement.childNodes.length - 1];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = text;
            }

            // Update card status class
            card.classList.remove('status-excellent', 'status-good', 'status-warning', 'status-poor', 'status-critical');
            card.classList.add(`status-${status}`);

        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    /**
     * Cleanup method
     */
    cleanup() {
        try {
            // Remove event listeners
            const exportBtn = document.getElementById('exportMetrics');
            const resetBtn = document.getElementById('resetMetrics');

            if (exportBtn) {
                exportBtn.removeEventListener('click', this.exportMetrics);
            }

            if (resetBtn) {
                resetBtn.removeEventListener('click', this.resetMetrics);
            }

            console.log('Professional dashboard cleaned up');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

export default ProfessionalDashboard;