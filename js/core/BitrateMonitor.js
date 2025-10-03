/**
 * BitrateMonitor - Tracks bitrate changes, quality adaptations, and bandwidth estimations
 */
export default class BitrateMonitor {
    constructor() {
        this.metrics = {
            current_bitrate: 0, // kbps
            avg_bitrate_played: 0, // kbps
            current_bandwidth: 0, // kbps
            bitrate_history: [],
            session_start_time: null,
            total_bitrate_time: 0, // for weighted average calculation
            weighted_bitrate_sum: 0
        };

        this.hlsInstance = null;
        this.realTimeUpdateInterval = null;
        this.lastQualityChangeTime = null;
        this.bitrateChart = null;
        this.lastDebugLog = null;

        console.log('BitrateMonitor initialized');
    }

    /**
     * Set HLS instance for event listening
     */
    setHLSInstance(hlsInstance) {
        try {
            this.hlsInstance = hlsInstance;
            this.setupHLSEventListeners();
            console.log('HLS instance set for bitrate monitoring');
        } catch (error) {
            console.error('Error setting HLS instance:', error);
        }
    }

    /**
     * Setup HLS.js event listeners for bitrate tracking
     */
    setupHLSEventListeners() {
        if (!this.hlsInstance || !window.Hls) return;

        try {
            // Listen for quality level changes
            this.hlsInstance.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
                console.log('HLS LEVEL_SWITCHED event:', data);
                this.onQualityChange(data.level, data);
            });

            // Listen for manifest parsed to get available levels
            this.hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log('Available quality levels:', data.levels.length);
                this.initializeBitrateTracking(data.levels);
            });

            // Listen for fragment loading for bandwidth estimation
            this.hlsInstance.on(window.Hls.Events.FRAG_LOADED, (event, data) => {
                this.updateBandwidthEstimate(data);
            });

            // Also listen for level loading to track current level
            this.hlsInstance.on(window.Hls.Events.LEVEL_LOADING, (event, data) => {
                console.log('HLS LEVEL_LOADING event:', data);
            });

            console.log('HLS event listeners setup for bitrate monitoring');
        } catch (error) {
            console.error('Error setting up HLS event listeners:', error);
        }
    }

    /**
     * Initialize bitrate tracking when manifest is loaded
     */
    initializeBitrateTracking(levels) {
        try {
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.session_start_time = Date.now();
            } else {
                this.metrics.session_start_time = performance.now();
            }

            // Set initial bitrate from current HLS level
            if (this.hlsInstance && this.hlsInstance.currentLevel >= 0 && levels && levels[this.hlsInstance.currentLevel]) {
                const currentLevel = levels[this.hlsInstance.currentLevel];
                this.metrics.current_bitrate = Math.round(currentLevel.bitrate / 1000); // Convert to kbps
                this.metrics.avg_bitrate_played = this.metrics.current_bitrate;

                console.log('Initial bitrate set to:', this.metrics.current_bitrate + ' kbps from level', this.hlsInstance.currentLevel);
            } else if (levels && levels.length > 0) {
                // Fallback to first level
                const initialLevel = levels[0];
                this.metrics.current_bitrate = Math.round(initialLevel.bitrate / 1000);
                this.metrics.avg_bitrate_played = this.metrics.current_bitrate;

                console.log('Initial bitrate set to fallback:', this.metrics.current_bitrate + ' kbps');
            }

            this.startRealTimeUpdates();
            this.updateBitrateDisplay();
        } catch (error) {
            console.error('Error initializing bitrate tracking:', error);
        }
    }

    /**
     * Handle quality level changes
     */
    onQualityChange(levelIndex, data) {
        try {
            if (!this.hlsInstance || !this.hlsInstance.levels) return;

            const level = this.hlsInstance.levels[levelIndex];
            if (!level) return;

            const newBitrate = Math.round(level.bitrate / 1000); // Convert to kbps
            const timestamp = Date.now();

            // Update current bitrate
            this.metrics.current_bitrate = newBitrate;

            // Add to history
            this.metrics.bitrate_history.push({
                timestamp: timestamp,
                bitrate: newBitrate,
                level: levelIndex,
                resolution: `${level.width}x${level.height}`,
                fps: level.frameRate || 'N/A'
            });

            // Keep history limited to last 100 entries
            if (this.metrics.bitrate_history.length > 100) {
                this.metrics.bitrate_history = this.metrics.bitrate_history.slice(-100);
            }

            // Update average bitrate calculation
            this.updateAverageBitrate(newBitrate);

            console.log(`Quality changed to level ${levelIndex}: ${newBitrate} kbps (${level.width}x${level.height})`);
            this.updateBitrateDisplay();
        } catch (error) {
            console.error('Error handling quality change:', error);
        }
    }

    /**
     * Update average bitrate calculation using weighted average
     */
    updateAverageBitrate(currentBitrate) {
        try {
            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            if (this.lastQualityChangeTime) {
                // Calculate time spent at previous bitrate
                const timeDelta = (currentTime - this.lastQualityChangeTime) / 1000; // Convert to seconds

                // Add weighted contribution to average
                this.metrics.weighted_bitrate_sum += (this.metrics.current_bitrate * timeDelta);
                this.metrics.total_bitrate_time += timeDelta;

                // Calculate weighted average
                if (this.metrics.total_bitrate_time > 0) {
                    this.metrics.avg_bitrate_played = Math.round(
                        this.metrics.weighted_bitrate_sum / this.metrics.total_bitrate_time
                    );
                }
            } else {
                // First quality change
                this.metrics.avg_bitrate_played = currentBitrate;
            }

            this.lastQualityChangeTime = currentTime;
        } catch (error) {
            console.error('Error updating average bitrate:', error);
        }
    }

    /**
     * Update bandwidth estimation from fragment loading data
     */
    updateBandwidthEstimate(fragmentData) {
        try {
            if (!fragmentData || !fragmentData.stats) return;

            const stats = fragmentData.stats;

            // Calculate bandwidth from fragment loading stats
            if (stats.total && stats.loaded && stats.total > 0) {
                const loadTimeMs = stats.loading.end - stats.loading.start;
                if (loadTimeMs > 0) {
                    // Calculate bandwidth in kbps
                    const bytesLoaded = stats.total;
                    const loadTimeSeconds = loadTimeMs / 1000;
                    const bandwidthBps = (bytesLoaded * 8) / loadTimeSeconds; // bits per second
                    const bandwidthKbps = Math.round(bandwidthBps / 1000); // kbps

                    this.metrics.current_bandwidth = bandwidthKbps;
                }
            }

            // Also use HLS.js internal bandwidth estimate if available
            if (this.hlsInstance && this.hlsInstance.bandwidthEstimate) {
                const hlsBandwidth = Math.round(this.hlsInstance.bandwidthEstimate / 1000); // Convert to kbps

                // Use the higher of the two estimates for more conservative measurement
                this.metrics.current_bandwidth = Math.max(this.metrics.current_bandwidth, hlsBandwidth);
            }

        } catch (error) {
            console.error('Error updating bandwidth estimate:', error);
        }
    }

    /**
     * Start real-time updates for bitrate metrics
     */
    startRealTimeUpdates() {
        try {
            // Clear any existing interval
            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
            }

            // Update every 2000ms for bitrate metrics
            this.realTimeUpdateInterval = setInterval(() => {
                this.updateCurrentBitrateFromHLS();
                this.updateBitrateDisplay();
                this.updateAverageBitrateFromCurrentTime();
            }, 2000);

            console.log('Real-time bitrate updates started');
        } catch (error) {
            console.error('Error starting real-time updates:', error);
        }
    }

    /**
     * Update current bitrate directly from HLS instance
     */
    updateCurrentBitrateFromHLS() {
        try {
            if (!this.hlsInstance) {
                console.log('BitrateMonitor: No HLS instance available');
                return;
            }

            // Debug: Log HLS instance state (only every 10 seconds to reduce spam)
            if (!this.lastDebugLog || Date.now() - this.lastDebugLog > 10000) {
                const debugInfo = {
                    currentLevel: this.hlsInstance.currentLevel,
                    autoLevelEnabled: this.hlsInstance.autoLevelEnabled,
                    levels: this.hlsInstance.levels ? this.hlsInstance.levels.length : 0,
                    bandwidthEstimate: this.hlsInstance.bandwidthEstimate,
                    loadLevel: this.hlsInstance.loadLevel,
                    nextLevel: this.hlsInstance.nextLevel
                };
                console.log('BitrateMonitor: HLS Debug Info:', debugInfo);
                this.lastDebugLog = Date.now();
            }

            // Get current level from HLS.js
            const currentLevel = this.hlsInstance.currentLevel;
            if (currentLevel >= 0 && this.hlsInstance.levels && this.hlsInstance.levels[currentLevel]) {
                const level = this.hlsInstance.levels[currentLevel];
                const newBitrate = Math.round(level.bitrate / 1000); // Convert to kbps

                // Always update bitrate and display
                const oldBitrate = this.metrics.current_bitrate;
                this.metrics.current_bitrate = newBitrate;

                // Only log when bitrate actually changes
                if (newBitrate !== oldBitrate) {
                    console.log(`BitrateMonitor: Bitrate changed from ${oldBitrate} to ${newBitrate} kbps (Level: ${currentLevel}, Resolution: ${level.width}x${level.height})`);
                }

                // Add to history for tracking
                this.metrics.bitrate_history.push({
                    timestamp: Date.now(),
                    bitrate: newBitrate,
                    level: currentLevel,
                    resolution: `${level.width}x${level.height}`,
                    fps: level.frameRate || 'N/A'
                });

                // Keep history limited
                if (this.metrics.bitrate_history.length > 100) {
                    this.metrics.bitrate_history = this.metrics.bitrate_history.slice(-100);
                }

                // Update average bitrate
                this.updateAverageBitrate(newBitrate);
            } else {
                console.log('BitrateMonitor: No valid current level found');

                // Log available levels for debugging
                if (this.hlsInstance.levels) {
                    console.log('BitrateMonitor: Available levels:', this.hlsInstance.levels.map((level, index) => ({
                        index,
                        bitrate: Math.round(level.bitrate / 1000) + ' kbps',
                        resolution: `${level.width}x${level.height}`
                    })));
                }
            }

            // Also try to get bandwidth estimate
            if (this.hlsInstance.bandwidthEstimate) {
                const bandwidthKbps = Math.round(this.hlsInstance.bandwidthEstimate / 1000);
                this.metrics.current_bandwidth = bandwidthKbps;
                console.log('BitrateMonitor: Bandwidth estimate:', bandwidthKbps, 'kbps');
            } else {
                console.log('BitrateMonitor: No bandwidth estimate available');
            }

        } catch (error) {
            console.error('BitrateMonitor: Error updating current bitrate from HLS:', error);
        }
    }

    /**
     * Update average bitrate calculation based on current time
     */
    updateAverageBitrateFromCurrentTime() {
        try {
            if (!this.lastQualityChangeTime) return;

            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            // Update the weighted average with current bitrate
            const timeDelta = (currentTime - this.lastQualityChangeTime) / 1000;
            if (timeDelta > 0) {
                this.metrics.weighted_bitrate_sum += (this.metrics.current_bitrate * timeDelta);
                this.metrics.total_bitrate_time += timeDelta;

                if (this.metrics.total_bitrate_time > 0) {
                    this.metrics.avg_bitrate_played = Math.round(
                        this.metrics.weighted_bitrate_sum / this.metrics.total_bitrate_time
                    );
                }

                this.lastQualityChangeTime = currentTime;
            }
        } catch (error) {
            console.error('Error updating average bitrate from current time:', error);
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
                console.log('Real-time bitrate updates stopped');
            }
        } catch (error) {
            console.error('Error stopping real-time updates:', error);
        }
    }

    /**
     * Get current bitrate metrics
     */
    getCurrentBitrate() {
        return this.metrics.current_bitrate;
    }

    /**
     * Get average bitrate over session
     */
    getAverageBitrate() {
        return this.metrics.avg_bitrate_played;
    }

    /**
     * Get current bandwidth estimate
     */
    getCurrentBandwidth() {
        return this.metrics.current_bandwidth;
    }

    /**
     * Get bitrate history for trend analysis
     */
    getBitrateHistory() {
        return [...this.metrics.bitrate_history];
    }

    /**
     * Get all bitrate metrics
     */
    getBitrateMetrics() {
        return {
            current_bitrate: this.metrics.current_bitrate,
            avg_bitrate_played: this.metrics.avg_bitrate_played,
            current_bandwidth: this.metrics.current_bandwidth,
            bitrate_history: this.getBitrateHistory()
        };
    }

    /**
     * Force HLS to use a specific quality level (for testing)
     */
    forceQualityLevel(levelIndex) {
        try {
            if (!this.hlsInstance || !this.hlsInstance.levels) {
                console.log('BitrateMonitor: Cannot force quality - no HLS instance or levels');
                return;
            }

            if (levelIndex < 0 || levelIndex >= this.hlsInstance.levels.length) {
                console.log('BitrateMonitor: Invalid level index:', levelIndex);
                return;
            }

            console.log('BitrateMonitor: Forcing quality level to:', levelIndex);
            this.hlsInstance.currentLevel = levelIndex;
            this.hlsInstance.loadLevel = levelIndex;

            // Trigger immediate update
            this.updateCurrentBitrateFromHLS();

        } catch (error) {
            console.error('BitrateMonitor: Error forcing quality level:', error);
        }
    }

    /**
     * Enable/disable adaptive bitrate
     */
    setAdaptiveBitrate(enabled) {
        try {
            if (!this.hlsInstance) {
                console.log('BitrateMonitor: Cannot set adaptive bitrate - no HLS instance');
                return;
            }

            if (enabled) {
                console.log('BitrateMonitor: Enabling adaptive bitrate');
                this.hlsInstance.currentLevel = -1; // -1 enables auto level selection
            } else {
                console.log('BitrateMonitor: Disabling adaptive bitrate');
                // Keep current level fixed
                const currentLevel = this.hlsInstance.currentLevel;
                if (currentLevel >= 0) {
                    this.hlsInstance.loadLevel = currentLevel;
                }
            }

        } catch (error) {
            console.error('BitrateMonitor: Error setting adaptive bitrate:', error);
        }
    }

    /**
     * Update bitrate display in the UI
     */
    updateBitrateDisplay() {
        try {
            // Find or create bitrate metrics panel
            let bitratePanel = document.getElementById('bitrateMetricsPanel');

            if (!bitratePanel) {
                this.createBitratePanel();
                bitratePanel = document.getElementById('bitrateMetricsPanel');
            }

            if (bitratePanel) {
                const currentBitrateElement = bitratePanel.querySelector('#currentBitrateValue');
                const avgBitrateElement = bitratePanel.querySelector('#avgBitrateValue');
                const currentBandwidthElement = bitratePanel.querySelector('#currentBandwidthValue');
                const bitrateStatusElement = bitratePanel.querySelector('#bitrateStatus');
                const qualityLevelElement = bitratePanel.querySelector('#qualityLevelValue');

                if (currentBitrateElement) {
                    currentBitrateElement.textContent = this.metrics.current_bitrate.toLocaleString() + ' kbps';

                    // Add visual indicators based on bitrate level
                    currentBitrateElement.className = 'info-item__value';
                    if (this.metrics.current_bitrate >= 5000) {
                        currentBitrateElement.classList.add('bitrate-high');
                        currentBitrateElement.title = 'High quality bitrate (≥5 Mbps)';
                    } else if (this.metrics.current_bitrate >= 2000) {
                        currentBitrateElement.classList.add('bitrate-medium');
                        currentBitrateElement.title = 'Medium quality bitrate (2-5 Mbps)';
                    } else if (this.metrics.current_bitrate > 0) {
                        currentBitrateElement.classList.add('bitrate-low');
                        currentBitrateElement.title = 'Low quality bitrate (<2 Mbps)';
                    }
                }

                if (avgBitrateElement) {
                    avgBitrateElement.textContent = this.metrics.avg_bitrate_played.toLocaleString() + ' kbps';
                }

                if (currentBandwidthElement) {
                    if (this.metrics.current_bandwidth > 0) {
                        currentBandwidthElement.textContent = this.metrics.current_bandwidth.toLocaleString() + ' kbps';

                        // Add bandwidth quality indicators
                        currentBandwidthElement.className = 'info-item__value';
                        if (this.metrics.current_bandwidth >= 10000) {
                            currentBandwidthElement.classList.add('bandwidth-excellent');
                            currentBandwidthElement.title = 'Excellent bandwidth (≥10 Mbps)';
                        } else if (this.metrics.current_bandwidth >= 5000) {
                            currentBandwidthElement.classList.add('bandwidth-good');
                            currentBandwidthElement.title = 'Good bandwidth (5-10 Mbps)';
                        } else if (this.metrics.current_bandwidth >= 2000) {
                            currentBandwidthElement.classList.add('bandwidth-fair');
                            currentBandwidthElement.title = 'Fair bandwidth (2-5 Mbps)';
                        } else {
                            currentBandwidthElement.classList.add('bandwidth-poor');
                            currentBandwidthElement.title = 'Poor bandwidth (<2 Mbps)';
                        }
                    } else {
                        currentBandwidthElement.textContent = 'Measuring...';
                        currentBandwidthElement.className = 'info-item__value';
                    }
                }

                if (bitrateStatusElement) {
                    if (this.metrics.bitrate_history.length > 0) {
                        const recentChanges = this.metrics.bitrate_history.slice(-5);
                        const hasRecentChanges = recentChanges.length > 1;

                        if (hasRecentChanges) {
                            bitrateStatusElement.textContent = 'Adaptive';
                            bitrateStatusElement.className = 'info-item__value bitrate-adaptive';
                            bitrateStatusElement.title = 'Bitrate is adapting to network conditions';
                        } else {
                            bitrateStatusElement.textContent = 'Stable';
                            bitrateStatusElement.className = 'info-item__value bitrate-stable';
                            bitrateStatusElement.title = 'Bitrate is stable';
                        }
                    } else {
                        bitrateStatusElement.textContent = 'Initializing';
                        bitrateStatusElement.className = 'info-item__value';
                    }
                }

                if (qualityLevelElement && this.metrics.bitrate_history.length > 0) {
                    const latest = this.metrics.bitrate_history[this.metrics.bitrate_history.length - 1];
                    qualityLevelElement.textContent = latest.resolution || 'Unknown';
                    qualityLevelElement.title = `Level ${latest.level}, ${latest.fps} fps`;
                }

                // Update adaptation count
                const adaptationCountElement = bitratePanel.querySelector('#adaptationCountValue');
                if (adaptationCountElement) {
                    adaptationCountElement.textContent = this.metrics.bitrate_history.length;

                    // Add visual indicators for adaptation frequency
                    adaptationCountElement.className = 'info-item__value';
                    if (this.metrics.bitrate_history.length > 10) {
                        adaptationCountElement.classList.add('bitrate-adaptive');
                        adaptationCountElement.title = 'High adaptation frequency - network conditions are variable';
                    } else if (this.metrics.bitrate_history.length > 5) {
                        adaptationCountElement.classList.add('bitrate-medium');
                        adaptationCountElement.title = 'Moderate adaptation frequency - some network variation';
                    } else if (this.metrics.bitrate_history.length > 1) {
                        adaptationCountElement.classList.add('bitrate-stable');
                        adaptationCountElement.title = 'Low adaptation frequency - stable network conditions';
                    }
                }
            }

            // Update chart if available
            this.updateBitrateChart();
        } catch (error) {
            console.error('Error updating bitrate display:', error);
        }
    }

    /**
     * Create bitrate metrics panel in dashboard
     */
    createBitratePanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) {
                console.warn('Dashboard grid not found, cannot create bitrate panel');
                return;
            }

            const bitratePanel = document.createElement('article');
            bitratePanel.className = 'card';
            bitratePanel.id = 'bitrateMetricsPanel';

            bitratePanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-signal"></i>
                        Bitrate & Bandwidth
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Current Bitrate:</span>
                            <span class="info-item__value" id="currentBitrateValue">0 kbps</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Average Bitrate:</span>
                            <span class="info-item__value" id="avgBitrateValue">0 kbps</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Current Bandwidth:</span>
                            <span class="info-item__value" id="currentBandwidthValue">Measuring...</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Status:</span>
                            <span class="info-item__value" id="bitrateStatus">Initializing</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Quality Level:</span>
                            <span class="info-item__value" id="qualityLevelValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Adaptations:</span>
                            <span class="info-item__value" id="adaptationCountValue">0</span>
                        </div>
                    </div>
                    <div class="debug-controls" style="margin-top: 1rem; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 5px;">
                        <h4 style="margin: 0 0 10px 0; color: #cbd5e1;">Debug Controls</h4>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button id="enableAdaptive" class="btn btn--small" style="padding: 5px 10px; font-size: 12px;">Enable Adaptive</button>
                            <button id="disableAdaptive" class="btn btn--small" style="padding: 5px 10px; font-size: 12px;">Disable Adaptive</button>
                            <select id="qualitySelector" style="padding: 5px; background: #334155; color: white; border: 1px solid #475569; border-radius: 3px;">
                                <option value="-1">Auto Quality</option>
                            </select>
                        </div>
                    </div>
                    <div class="chart-container" style="margin-top: 1rem;">
                        <canvas id="bitrateChart" aria-label="Bitrate trend chart" style="max-height: 200px;"></canvas>
                    </div>
                </div>
            `;

            // Insert after existing panels
            dashboardGrid.appendChild(bitratePanel);

            // Initialize the chart and debug controls after panel is created
            setTimeout(() => {
                this.initializeBitrateChart();
                this.setupDebugControls();
            }, 100);

            console.log('Bitrate metrics panel created');
        } catch (error) {
            console.error('Error creating bitrate panel:', error);
        }
    }

    /**
     * Initialize Chart.js bitrate trend chart
     */
    initializeBitrateChart() {
        try {
            if (!window.Chart) {
                console.warn('Chart.js not available, skipping bitrate chart initialization');
                return;
            }

            const canvas = document.getElementById('bitrateChart');
            if (!canvas) {
                console.warn('Bitrate chart canvas not found');
                return;
            }

            const ctx = canvas.getContext('2d');

            this.bitrateChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Current Bitrate (kbps)',
                            data: [],
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Bandwidth Estimate (kbps)',
                            data: [],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Bitrate & Bandwidth Trends',
                            color: '#f8fafc',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#cbd5e1',
                                font: {
                                    size: 12
                                },
                                usePointStyle: true,
                                pointStyle: 'line'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleColor: '#f8fafc',
                            bodyColor: '#cbd5e1',
                            borderColor: '#334155',
                            borderWidth: 1,
                            callbacks: {
                                label: function (context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} kbps`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Time',
                                color: '#94a3b8'
                            },
                            ticks: {
                                color: '#94a3b8',
                                maxTicksLimit: 10
                            },
                            grid: {
                                color: 'rgba(148, 163, 184, 0.1)'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Bitrate (kbps)',
                                color: '#94a3b8'
                            },
                            ticks: {
                                color: '#94a3b8',
                                callback: function (value) {
                                    return value.toLocaleString() + ' kbps';
                                }
                            },
                            grid: {
                                color: 'rgba(148, 163, 184, 0.1)'
                            }
                        }
                    },
                    animation: {
                        duration: 750,
                        easing: 'easeInOutQuart'
                    }
                }
            });

            console.log('Bitrate chart initialized');
        } catch (error) {
            console.error('Error initializing bitrate chart:', error);
        }
    }

    /**
     * Update bitrate chart with new data
     */
    updateBitrateChart() {
        try {
            if (!this.bitrateChart || !this.metrics.bitrate_history.length) return;

            const now = new Date();
            const timeLabel = now.toLocaleTimeString();

            // Add new data point
            this.bitrateChart.data.labels.push(timeLabel);
            this.bitrateChart.data.datasets[0].data.push(this.metrics.current_bitrate);
            this.bitrateChart.data.datasets[1].data.push(this.metrics.current_bandwidth);

            // Keep only last 20 data points for performance
            const maxPoints = 20;
            if (this.bitrateChart.data.labels.length > maxPoints) {
                this.bitrateChart.data.labels.shift();
                this.bitrateChart.data.datasets[0].data.shift();
                this.bitrateChart.data.datasets[1].data.shift();
            }

            // Update chart
            this.bitrateChart.update('none'); // Use 'none' for better performance

        } catch (error) {
            console.error('Error updating bitrate chart:', error);
        }
    }

    /**
     * Setup debug controls for testing bitrate changes
     */
    setupDebugControls() {
        try {
            const enableAdaptiveBtn = document.getElementById('enableAdaptive');
            const disableAdaptiveBtn = document.getElementById('disableAdaptive');
            const qualitySelector = document.getElementById('qualitySelector');

            if (enableAdaptiveBtn) {
                enableAdaptiveBtn.addEventListener('click', () => {
                    this.setAdaptiveBitrate(true);
                });
            }

            if (disableAdaptiveBtn) {
                disableAdaptiveBtn.addEventListener('click', () => {
                    this.setAdaptiveBitrate(false);
                });
            }

            if (qualitySelector) {
                // Populate quality selector with available levels
                if (this.hlsInstance && this.hlsInstance.levels) {
                    qualitySelector.innerHTML = '<option value="-1">Auto Quality</option>';
                    this.hlsInstance.levels.forEach((level, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = `${Math.round(level.bitrate / 1000)} kbps (${level.width}x${level.height})`;
                        qualitySelector.appendChild(option);
                    });
                }

                qualitySelector.addEventListener('change', (e) => {
                    const levelIndex = parseInt(e.target.value);
                    if (levelIndex === -1) {
                        this.setAdaptiveBitrate(true);
                    } else {
                        this.forceQualityLevel(levelIndex);
                    }
                });
            }

            console.log('BitrateMonitor: Debug controls setup complete');
        } catch (error) {
            console.error('Error setting up debug controls:', error);
        }
    }

    /**
     * Reset bitrate metrics for new session
     */
    resetMetrics() {
        try {
            this.stopRealTimeUpdates();

            this.metrics = {
                current_bitrate: 0,
                avg_bitrate_played: 0,
                current_bandwidth: 0,
                bitrate_history: [],
                session_start_time: null,
                total_bitrate_time: 0,
                weighted_bitrate_sum: 0
            };

            this.lastQualityChangeTime = null;

            // Reset chart data if chart exists
            if (this.bitrateChart) {
                this.bitrateChart.data.labels = [];
                this.bitrateChart.data.datasets[0].data = [];
                this.bitrateChart.data.datasets[1].data = [];
                this.bitrateChart.update('none');
            }

            this.updateBitrateDisplay();

            console.log('Bitrate metrics reset');
        } catch (error) {
            console.error('Error resetting bitrate metrics:', error);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.stopRealTimeUpdates();

            // Destroy chart if it exists
            if (this.bitrateChart) {
                this.bitrateChart.destroy();
                this.bitrateChart = null;
            }

            this.hlsInstance = null;
            console.log('BitrateMonitor cleanup completed');
        } catch (error) {
            console.error('Error during BitrateMonitor cleanup:', error);
        }
    }
}