/**
 * ErrorTracker - Comprehensive error tracking for HLS streams
 */
export default class ErrorTracker {
    constructor() {
        this.metrics = {
            error_count: 0,
            total_events: 0,
            error_percentage: 0,
            error_types: {
                network: 0,
                media: 0,
                mux: 0,
                other: 0
            },
            last_error: null,
            error_history: [],
            session_start_time: null
        };

        this.hlsInstance = null;
        this.dataConsumptionTracker = null;
        this.realTimeUpdateInterval = null;
        this.eventListeners = new Map();

        console.log('ErrorTracker initialized');

        // Create error panel immediately when dashboard is ready
        setTimeout(() => {
            this.createErrorPanel();
            this.updateErrorDisplay();
        }, 1000);
    }

    /**
     * Set HLS instance for error event listening
     */
    setHLSInstance(hlsInstance) {
        try {
            this.hlsInstance = hlsInstance;
            this.setupHLSErrorListeners();
            this.initializeErrorTracking();
            console.log('HLS instance set for error tracking');
        } catch (error) {
            console.error('Error setting HLS instance for error tracking:', error);
        }
    }

    /**
     * Set DataConsumptionTracker reference for total requests count
     */
    setDataConsumptionTracker(dataConsumptionTracker) {
        try {
            this.dataConsumptionTracker = dataConsumptionTracker;
            console.log('DataConsumptionTracker reference set for error tracking');
        } catch (error) {
            console.error('Error setting DataConsumptionTracker reference:', error);
        }
    }

    /**
     * Initialize error tracking session
     */
    initializeErrorTracking() {
        try {
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.session_start_time = Date.now();
            } else {
                this.metrics.session_start_time = performance.now();
            }

            this.startRealTimeUpdates();
            this.updateErrorDisplay();
            console.log('Error tracking session initialized');
        } catch (error) {
            console.error('Error initializing error tracking:', error);
        }
    }

    /**
     * Setup HLS.js error event listeners for all error types
     */
    setupHLSErrorListeners() {
        if (!this.hlsInstance || !window.Hls) return;

        try {
            // Main error event listener
            this.hlsInstance.on(window.Hls.Events.ERROR, (event, data) => {
                this.handleHLSError(event, data);
            });

            // Only track fragment load emergency aborted as it's an error
            this.hlsInstance.on(window.Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, () => {
                this.recordError('network', 'Fragment load emergency aborted', 'Fragment loading was aborted due to emergency conditions');
            });

            console.log('HLS error event listeners setup complete');
        } catch (error) {
            console.error('Error setting up HLS error listeners:', error);
        }
    }

    /**
     * Handle HLS.js error events and categorize them
     */
    handleHLSError(event, data) {
        try {
            console.error('HLS Error detected:', data);

            let errorType = 'other';
            let errorMessage = data.details || 'Unknown HLS error';
            let errorDescription = data.reason || data.error?.message || 'No additional details available';

            // Categorize error by type
            switch (data.type) {
                case window.Hls.ErrorTypes.NETWORK_ERROR:
                    errorType = 'network';
                    break;
                case window.Hls.ErrorTypes.MEDIA_ERROR:
                    errorType = 'media';
                    break;
                case window.Hls.ErrorTypes.MUX_ERROR:
                    errorType = 'mux';
                    break;
                default:
                    errorType = 'other';
                    break;
            }

            // Record the error
            this.recordError(errorType, errorMessage, errorDescription, data.fatal);

            console.log(`Error categorized as: ${errorType}, Fatal: ${data.fatal}, Message: ${errorMessage}`);
        } catch (error) {
            console.error('Error handling HLS error:', error);
        }
    }

    /**
     * Record an error and update metrics
     */
    recordError(type, message, description, isFatal = false) {
        try {
            // Increment error count
            this.metrics.error_count++;

            // Increment specific error type count
            if (this.metrics.error_types.hasOwnProperty(type)) {
                this.metrics.error_types[type]++;
            } else {
                this.metrics.error_types.other++;
            }

            // Update last error
            this.metrics.last_error = {
                type: type,
                message: message,
                description: description,
                timestamp: Date.now(),
                fatal: isFatal
            };

            // Add to error history
            this.metrics.error_history.push({
                type: type,
                message: message,
                description: description,
                timestamp: Date.now(),
                fatal: isFatal
            });

            // Keep history limited to last 50 errors
            if (this.metrics.error_history.length > 50) {
                this.metrics.error_history = this.metrics.error_history.slice(-50);
            }

            // Recalculate error percentage
            this.calculateErrorPercentage();

            // Update display
            this.updateErrorDisplay();

            console.log(`Error recorded: ${type} - ${message} (Fatal: ${isFatal})`);
        } catch (error) {
            console.error('Error recording error:', error);
        }
    }

    /**
     * Increment total events counter
     */
    incrementTotalEvents() {
        try {
            this.metrics.total_events++;
            this.calculateErrorPercentage();
        } catch (error) {
            console.error('Error incrementing total events:', error);
        }
    }

    /**
     * Calculate error percentage based on total requests vs error events
     */
    calculateErrorPercentage() {
        try {
            // Use total requests from DataConsumptionTracker if available
            let totalEvents = this.metrics.total_events || 0;
            if (this.dataConsumptionTracker && typeof this.dataConsumptionTracker.getTotalRequests === 'function') {
                const totalRequests = this.dataConsumptionTracker.getTotalRequests();
                if (typeof totalRequests === 'number' && !isNaN(totalRequests)) {
                    totalEvents = totalRequests;
                    this.metrics.total_events = totalEvents; // Update for display
                }
            }

            // Ensure error_count is valid
            const errorCount = this.metrics.error_count || 0;

            if (totalEvents > 0 && typeof errorCount === 'number' && !isNaN(errorCount)) {
                this.metrics.error_percentage = (errorCount / totalEvents) * 100;
            } else {
                this.metrics.error_percentage = 0;
            }

            // Ensure error_percentage is not NaN
            if (isNaN(this.metrics.error_percentage)) {
                this.metrics.error_percentage = 0;
            }
        } catch (error) {
            console.error('Error calculating error percentage:', error);
            this.metrics.error_percentage = 0;
        }
    }

    /**
     * Start real-time updates for error metrics
     */
    startRealTimeUpdates() {
        try {
            // Clear any existing interval
            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
            }

            // Update every 2000ms for error metrics
            this.realTimeUpdateInterval = setInterval(() => {
                this.updateErrorDisplay();
            }, 2000);

            console.log('Real-time error updates started');
        } catch (error) {
            console.error('Error starting real-time updates:', error);
        }
    }

    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        try {
            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
                this.realTimeUpdateInterval = null;
                console.log('Real-time error updates stopped');
            }
        } catch (error) {
            console.error('Error stopping real-time updates:', error);
        }
    }

    /**
     * Get current error metrics
     */
    getErrorMetrics() {
        return {
            error_count: this.metrics.error_count,
            total_events: this.metrics.total_events,
            error_percentage: this.metrics.error_percentage,
            error_types: { ...this.metrics.error_types },
            last_error: this.metrics.last_error ? { ...this.metrics.last_error } : null,
            error_history: [...this.metrics.error_history]
        };
    }

    /**
     * Update error display in the UI
     */
    updateErrorDisplay() {
        try {
            // Recalculate error percentage to get latest total requests count
            this.calculateErrorPercentage();

            // Find or create error metrics panel
            let errorPanel = document.getElementById('errorMetricsPanel');

            if (!errorPanel) {
                this.createErrorPanel();
                errorPanel = document.getElementById('errorMetricsPanel');
            }

            if (errorPanel) {
                const errorCountElement = errorPanel.querySelector('#errorCountValue');
                const totalEventsElement = errorPanel.querySelector('#totalEventsValue');
                const errorPercentageElement = errorPanel.querySelector('#errorPercentageValue');
                const errorStatusElement = errorPanel.querySelector('#errorStatus');
                const lastErrorElement = errorPanel.querySelector('#lastErrorValue');
                const networkErrorsElement = errorPanel.querySelector('#networkErrorsValue');
                const mediaErrorsElement = errorPanel.querySelector('#mediaErrorsValue');
                const muxErrorsElement = errorPanel.querySelector('#muxErrorsValue');
                const otherErrorsElement = errorPanel.querySelector('#otherErrorsValue');

                if (errorCountElement) {
                    errorCountElement.textContent = this.metrics.error_count;

                    // Add visual indicators based on error count
                    errorCountElement.className = 'info-item__value';
                    if (this.metrics.error_count > 10) {
                        errorCountElement.classList.add('error-high');
                        errorCountElement.title = 'High error count - stream quality may be affected';
                    } else if (this.metrics.error_count > 5) {
                        errorCountElement.classList.add('error-medium');
                        errorCountElement.title = 'Moderate error count - some issues detected';
                    } else if (this.metrics.error_count > 0) {
                        errorCountElement.classList.add('error-low');
                        errorCountElement.title = 'Low error count - minor issues detected';
                    } else {
                        errorCountElement.classList.add('error-none');
                        errorCountElement.title = 'No errors detected - excellent stream health';
                    }
                }

                if (totalEventsElement) {
                    totalEventsElement.textContent = this.metrics.total_events.toLocaleString();
                }

                if (errorPercentageElement) {
                    const percentage = isNaN(this.metrics.error_percentage) ? 0 : this.metrics.error_percentage;
                    errorPercentageElement.textContent = percentage.toFixed(2) + '%';

                    // Add visual indicators based on error percentage
                    errorPercentageElement.className = 'info-item__value';
                    if (this.metrics.error_percentage > 5) {
                        errorPercentageElement.classList.add('error-high');
                        errorPercentageElement.title = 'High error rate - poor stream reliability';
                    } else if (this.metrics.error_percentage > 2) {
                        errorPercentageElement.classList.add('error-medium');
                        errorPercentageElement.title = 'Moderate error rate - acceptable stream reliability';
                    } else if (this.metrics.error_percentage > 0) {
                        errorPercentageElement.classList.add('error-low');
                        errorPercentageElement.title = 'Low error rate - good stream reliability';
                    } else {
                        errorPercentageElement.classList.add('error-none');
                        errorPercentageElement.title = 'No errors - excellent stream reliability';
                    }
                }

                if (errorStatusElement) {
                    if (this.metrics.error_count === 0) {
                        errorStatusElement.textContent = 'Healthy';
                        errorStatusElement.className = 'info-item__value error-none';
                    } else if (this.metrics.error_percentage > 5) {
                        errorStatusElement.textContent = 'Critical';
                        errorStatusElement.className = 'info-item__value error-high';
                    } else if (this.metrics.error_percentage > 2) {
                        errorStatusElement.textContent = 'Warning';
                        errorStatusElement.className = 'info-item__value error-medium';
                    } else {
                        errorStatusElement.textContent = 'Stable';
                        errorStatusElement.className = 'info-item__value error-low';
                    }
                }

                if (lastErrorElement) {
                    if (this.metrics.last_error) {
                        const timeSince = Math.round((Date.now() - this.metrics.last_error.timestamp) / 1000);
                        lastErrorElement.textContent = `${this.metrics.last_error.type} (${timeSince}s ago)`;
                        lastErrorElement.title = `${this.metrics.last_error.message} - ${this.metrics.last_error.description}`;
                        lastErrorElement.className = 'info-item__value error-recent';
                    } else {
                        lastErrorElement.textContent = 'None';
                        lastErrorElement.className = 'info-item__value';
                        lastErrorElement.title = 'No errors detected in this session';
                    }
                }

                // Update error type counts
                if (networkErrorsElement) {
                    networkErrorsElement.textContent = this.metrics.error_types.network;
                }
                if (mediaErrorsElement) {
                    mediaErrorsElement.textContent = this.metrics.error_types.media;
                }
                if (muxErrorsElement) {
                    muxErrorsElement.textContent = this.metrics.error_types.mux;
                }
                if (otherErrorsElement) {
                    otherErrorsElement.textContent = this.metrics.error_types.other;
                }
            }
        } catch (error) {
            console.error('Error updating error display:', error);
        }
    }

    /**
     * Create error metrics panel in dashboard
     */
    createErrorPanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) {
                console.warn('Dashboard grid not found, cannot create error panel');
                return;
            }

            const errorPanel = document.createElement('article');
            errorPanel.className = 'card';
            errorPanel.id = 'errorMetricsPanel';

            errorPanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-exclamation-triangle"></i>
                        Error Tracking & Analysis
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Error Count:</span>
                            <span class="info-item__value error-none" id="errorCountValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Total Events:</span>
                            <span class="info-item__value" id="totalEventsValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Error Percentage:</span>
                            <span class="info-item__value error-none" id="errorPercentageValue">0.00%</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Status:</span>
                            <span class="info-item__value error-none" id="errorStatus">Healthy</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Last Error:</span>
                            <span class="info-item__value" id="lastErrorValue">None</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Network Errors:</span>
                            <span class="info-item__value" id="networkErrorsValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Media Errors:</span>
                            <span class="info-item__value" id="mediaErrorsValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Mux Errors:</span>
                            <span class="info-item__value" id="muxErrorsValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Other Errors:</span>
                            <span class="info-item__value" id="otherErrorsValue">0</span>
                        </div>
                    </div>
                </div>
            `;

            // Insert after User Information card (position 3)
            const overviewCard = document.getElementById('overviewMetricsPanel');
            if (overviewCard && overviewCard.nextSibling && overviewCard.nextSibling.nextSibling) {
                // Insert after the second card (User Information)
                dashboardGrid.insertBefore(errorPanel, overviewCard.nextSibling.nextSibling);
            } else {
                dashboardGrid.appendChild(errorPanel);
            }

            console.log('Error metrics panel created');
        } catch (error) {
            console.error('Error creating error panel:', error);
        }
    }

    /**
     * Reset error metrics for new session
     */
    resetErrorMetrics() {
        try {
            this.stopRealTimeUpdates();

            this.metrics = {
                error_count: 0,
                total_events: 0,
                error_percentage: 0,
                error_types: {
                    network: 0,
                    media: 0,
                    mux: 0,
                    other: 0
                },
                last_error: null,
                error_history: [],
                session_start_time: null
            };

            this.updateErrorDisplay();
            console.log('Error metrics reset');
        } catch (error) {
            console.error('Error resetting error metrics:', error);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.stopRealTimeUpdates();

            // Clear event listeners
            this.eventListeners.clear();

            console.log('ErrorTracker cleanup completed');
        } catch (error) {
            console.error('Error during ErrorTracker cleanup:', error);
        }
    }
}