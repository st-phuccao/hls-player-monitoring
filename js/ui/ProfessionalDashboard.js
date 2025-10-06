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
            // Event listeners can be added here for future dashboard controls

        } catch (error) {
            console.error('Error adding event listeners:', error);
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
            const resetBtn = document.getElementById('resetMetrics');

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