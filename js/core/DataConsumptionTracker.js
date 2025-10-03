/**
 * DataConsumptionTracker - Track data consumption and transfer rates for HLS streams
 */
export default class DataConsumptionTracker {
    constructor() {
        this.metrics = {
            total_data_loaded: 0, // in GB
            data_rate: 0, // MB/s
            data_efficiency: 0, // MB per minute of playback
            bytes_loaded: 0, // internal tracking in bytes
            session_start_time: null,
            last_update_time: null,
            data_history: [],
            transfer_rates: []
        };

        this.hlsInstance = null;
        this.performanceTracker = null;
        this.realTimeUpdateInterval = null;
        this.lastFragmentTime = null;
        this.lastFragmentBytes = 0;

        console.log('DataConsumptionTracker initialized');

        // Create panel immediately and start basic tracking
        setTimeout(() => {
            this.createDataPanel();
            this.initializeBasicTracking();
        }, 1000);
    }

    /**
     * Initialize basic tracking without HLS instance
     */
    initializeBasicTracking() {
        try {
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.session_start_time = Date.now();
                this.metrics.last_update_time = Date.now();
            } else {
                this.metrics.session_start_time = performance.now();
                this.metrics.last_update_time = performance.now();
            }

            this.startRealTimeUpdates();
            this.updateDataDisplay();
            console.log('Basic data consumption tracking initialized');
        } catch (error) {
            console.error('Error initializing basic tracking:', error);
        }
    }

    /**
     * Set HLS instance for data consumption tracking
     */
    setHLSInstance(hlsInstance) {
        try {
            this.hlsInstance = hlsInstance;
            this.setupHLSDataListeners();
            this.initializeDataTracking();
            console.log('HLS instance set for data consumption tracking');
        } catch (error) {
            console.error('Error setting HLS instance for data tracking:', error);
        }
    }

    /**
     * Set performance tracker for playback time calculations
     */
    setPerformanceTracker(performanceTracker) {
        try {
            this.performanceTracker = performanceTracker;
            console.log('Performance tracker set for data efficiency calculations');
        } catch (error) {
            console.error('Error setting performance tracker:', error);
        }
    }

    /**
     * Set video element for additional data tracking
     */
    setVideoElement(videoElement) {
        try {
            this.videoElement = videoElement;
            this.setupVideoElementTracking();
            console.log('Video element set for data consumption tracking');
        } catch (error) {
            console.error('Error setting video element:', error);
        }
    }

    /**
     * Setup video element tracking for buffer monitoring
     */
    setupVideoElementTracking() {
        if (!this.videoElement) return;

        try {
            // Track buffer changes to estimate data consumption
            this.videoElement.addEventListener('progress', () => {
                this.trackBufferProgress();
            });

            // Track when new data is loaded
            this.videoElement.addEventListener('loadeddata', () => {
                this.trackVideoDataLoaded();
            });

            console.log('Video element tracking setup complete');
        } catch (error) {
            console.error('Error setting up video element tracking:', error);
        }
    }

    /**
     * Track buffer progress to estimate data consumption
     */
    trackBufferProgress() {
        try {
            if (!this.videoElement || !this.videoElement.buffered) return;

            const buffered = this.videoElement.buffered;
            let totalBufferedSeconds = 0;

            for (let i = 0; i < buffered.length; i++) {
                totalBufferedSeconds += buffered.end(i) - buffered.start(i);
            }

            // Estimate data based on buffer and bitrate
            if (this.hlsInstance && this.hlsInstance.levels && this.hlsInstance.currentLevel >= 0) {
                const currentLevel = this.hlsInstance.levels[this.hlsInstance.currentLevel];
                if (currentLevel && currentLevel.bitrate) {
                    const estimatedBytes = (currentLevel.bitrate / 8) * totalBufferedSeconds; // bitrate is in bits/sec

                    // Only add if this is significantly more than what we've tracked
                    if (estimatedBytes > this.metrics.bytes_loaded * 1.1) {
                        const additionalBytes = estimatedBytes - this.metrics.bytes_loaded;
                        this.addDataLoaded(additionalBytes);
                        console.log(`Buffer-based data estimation: +${(additionalBytes / 1024 / 1024).toFixed(2)} MB`);
                    }
                }
            }
        } catch (error) {
            console.error('Error tracking buffer progress:', error);
        }
    }

    /**
     * Track when video data is loaded
     */
    trackVideoDataLoaded() {
        try {
            // This is called when the first frame is loaded
            // We can use this as a trigger to check our data tracking
            console.log('Video data loaded event - current tracked data:', (this.metrics.bytes_loaded / 1024 / 1024).toFixed(2), 'MB');
        } catch (error) {
            console.error('Error tracking video data loaded:', error);
        }
    }

    /**
     * Initialize data consumption tracking session
     */
    initializeDataTracking() {
        try {
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.session_start_time = Date.now();
                this.metrics.last_update_time = Date.now();
            } else {
                this.metrics.session_start_time = performance.now();
                this.metrics.last_update_time = performance.now();
            }

            this.startRealTimeUpdates();
            this.updateDataDisplay();
            console.log('Data consumption tracking session initialized');
        } catch (error) {
            console.error('Error initializing data tracking:', error);
        }
    }

    /**
     * Setup HLS.js event listeners for data consumption tracking
     */
    setupHLSDataListeners() {
        if (!this.hlsInstance || !window.Hls) return;

        try {
            // Track fragment loading progress for real-time data consumption
            this.hlsInstance.on(window.Hls.Events.FRAG_LOAD_PROGRESS, (event, data) => {
                this.handleFragmentProgress(event, data);
            });

            // Track completed fragment loads for accurate data measurement
            this.hlsInstance.on(window.Hls.Events.FRAG_LOADED, (event, data) => {
                this.handleFragmentLoaded(event, data);
            });

            // Track manifest loading for complete data consumption
            this.hlsInstance.on(window.Hls.Events.MANIFEST_LOADED, (event, data) => {
                this.handleManifestLoaded(event, data);
            });

            // Track level loading for playlist data
            this.hlsInstance.on(window.Hls.Events.LEVEL_LOADED, (event, data) => {
                this.handleLevelLoaded(event, data);
            });

            // Track audio fragment loading
            this.hlsInstance.on(window.Hls.Events.AUDIO_TRACK_LOADED, (event, data) => {
                this.handleAudioTrackLoaded(event, data);
            });

            // Track subtitle loading
            this.hlsInstance.on(window.Hls.Events.SUBTITLE_TRACK_LOADED, (event, data) => {
                this.handleSubtitleTrackLoaded(event, data);
            });

            // Track key loading (for encrypted streams)
            this.hlsInstance.on(window.Hls.Events.KEY_LOADED, (event, data) => {
                this.handleKeyLoaded(event, data);
            });

            // Track fragment parsing (alternative data source)
            this.hlsInstance.on(window.Hls.Events.FRAG_PARSING_DATA, (event, data) => {
                this.handleFragmentParsingData(event, data);
            });

            // Add network monitoring through XMLHttpRequest interception
            this.setupNetworkInterception();

            console.log('HLS data consumption event listeners setup complete');
        } catch (error) {
            console.error('Error setting up HLS data listeners:', error);
        }
    }

    /**
     * Handle fragment loading progress for real-time data tracking
     */
    handleFragmentProgress(event, data) {
        try {
            if (data.stats && data.stats.loaded) {
                // Track progressive loading for real-time updates
                const bytesLoaded = data.stats.loaded;
                const currentTime = Date.now();

                // Calculate transfer rate for this fragment
                if (this.lastFragmentTime && this.lastFragmentBytes < bytesLoaded) {
                    const timeDelta = (currentTime - this.lastFragmentTime) / 1000; // seconds
                    const bytesDelta = bytesLoaded - this.lastFragmentBytes;

                    if (timeDelta > 0) {
                        const transferRateMBps = (bytesDelta / (1024 * 1024)) / timeDelta;
                        this.updateTransferRate(transferRateMBps);
                    }
                }

                this.lastFragmentTime = currentTime;
                this.lastFragmentBytes = bytesLoaded;
            }
        } catch (error) {
            console.error('Error handling fragment progress:', error);
        }
    }

    /**
     * Handle completed fragment loads for accurate data measurement
     */
    handleFragmentLoaded(event, data) {
        try {
            console.log('Fragment loaded event data:', data); // Debug log

            let bytesLoaded = 0;

            // Try multiple ways to get fragment size
            if (data.stats && data.stats.total) {
                bytesLoaded = data.stats.total;
            } else if (data.stats && data.stats.loaded) {
                bytesLoaded = data.stats.loaded;
            } else if (data.frag && data.frag.stats && data.frag.stats.total) {
                bytesLoaded = data.frag.stats.total;
            } else if (data.payload && data.payload.byteLength) {
                bytesLoaded = data.payload.byteLength;
            }

            if (bytesLoaded > 0) {
                this.addDataLoaded(bytesLoaded);

                // Calculate transfer rate for completed fragment
                if (data.stats && data.stats.loading) {
                    const loadTime = (data.stats.loading.end - data.stats.loading.start) / 1000; // seconds
                    if (loadTime > 0) {
                        const transferRateMBps = (bytesLoaded / (1024 * 1024)) / loadTime;
                        this.updateTransferRate(transferRateMBps);
                    }
                }

                // Force update display immediately when new data arrives
                this.updateDataDisplay();

                console.log(`Fragment loaded: ${(bytesLoaded / 1024 / 1024).toFixed(2)} MB, Total: ${(this.metrics.bytes_loaded / 1024 / 1024 / 1024).toFixed(3)} GB`);
            } else {
                console.warn('Fragment loaded but no size data found:', data);
            }
        } catch (error) {
            console.error('Error handling fragment loaded:', error);
        }
    }

    /**
     * Handle manifest loading for playlist data consumption
     */
    handleManifestLoaded(event, data) {
        try {
            if (data.stats && data.stats.total) {
                const bytesLoaded = data.stats.total;
                this.addDataLoaded(bytesLoaded);
                this.updateDataDisplay();
                console.log(`Manifest loaded: ${(bytesLoaded / 1024).toFixed(2)} KB`);
            }
        } catch (error) {
            console.error('Error handling manifest loaded:', error);
        }
    }

    /**
     * Handle level loading for playlist updates
     */
    handleLevelLoaded(event, data) {
        try {
            if (data.stats && data.stats.total) {
                const bytesLoaded = data.stats.total;
                this.addDataLoaded(bytesLoaded);
                this.updateDataDisplay();
                console.log(`Level playlist loaded: ${(bytesLoaded / 1024).toFixed(2)} KB`);
            }
        } catch (error) {
            console.error('Error handling level loaded:', error);
        }
    }

    /**
     * Handle audio track loading
     */
    handleAudioTrackLoaded(event, data) {
        try {
            if (data.stats && data.stats.total) {
                const bytesLoaded = data.stats.total;
                this.addDataLoaded(bytesLoaded);
                this.updateDataDisplay();
                console.log(`Audio track loaded: ${(bytesLoaded / 1024).toFixed(2)} KB`);
            }
        } catch (error) {
            console.error('Error handling audio track loaded:', error);
        }
    }

    /**
     * Handle subtitle track loading
     */
    handleSubtitleTrackLoaded(event, data) {
        try {
            if (data.stats && data.stats.total) {
                const bytesLoaded = data.stats.total;
                this.addDataLoaded(bytesLoaded);
                this.updateDataDisplay();
                console.log(`Subtitle track loaded: ${(bytesLoaded / 1024).toFixed(2)} KB`);
            }
        } catch (error) {
            console.error('Error handling subtitle track loaded:', error);
        }
    }

    /**
     * Handle key loading for encrypted streams
     */
    handleKeyLoaded(event, data) {
        try {
            if (data.stats && data.stats.total) {
                const bytesLoaded = data.stats.total;
                this.addDataLoaded(bytesLoaded);
                this.updateDataDisplay();
                console.log(`Encryption key loaded: ${(bytesLoaded / 1024).toFixed(2)} KB`);
            }
        } catch (error) {
            console.error('Error handling key loaded:', error);
        }
    }

    /**
     * Handle fragment parsing data (alternative data tracking)
     */
    handleFragmentParsingData(event, data) {
        try {
            if (data && data.data && data.data.byteLength) {
                const bytesLoaded = data.data.byteLength;
                this.addDataLoaded(bytesLoaded);
                console.log(`Fragment parsing data: ${(bytesLoaded / 1024 / 1024).toFixed(2)} MB`);
            }
        } catch (error) {
            console.error('Error handling fragment parsing data:', error);
        }
    }

    /**
     * Add loaded data to total consumption
     */
    addDataLoaded(bytes) {
        try {
            this.metrics.bytes_loaded += bytes;
            this.metrics.total_data_loaded = this.metrics.bytes_loaded / (1024 * 1024 * 1024); // Convert to GB

            // Add to history for trend analysis
            this.metrics.data_history.push({
                timestamp: Date.now(),
                bytes: bytes,
                total_bytes: this.metrics.bytes_loaded,
                total_gb: this.metrics.total_data_loaded
            });

            // Keep history limited to last 100 entries
            if (this.metrics.data_history.length > 100) {
                this.metrics.data_history = this.metrics.data_history.slice(-100);
            }

            // Update calculations
            this.calculateDataRate();
            this.calculateDataEfficiency();
        } catch (error) {
            console.error('Error adding data loaded:', error);
        }
    }

    /**
     * Update transfer rate tracking
     */
    updateTransferRate(rateMBps) {
        try {
            this.metrics.transfer_rates.push({
                timestamp: Date.now(),
                rate: rateMBps
            });

            // Keep only recent transfer rates (last 50)
            if (this.metrics.transfer_rates.length > 50) {
                this.metrics.transfer_rates = this.metrics.transfer_rates.slice(-50);
            }

            // Calculate current data rate as average of recent rates
            if (this.metrics.transfer_rates.length > 0) {
                const recentRates = this.metrics.transfer_rates.slice(-10); // Last 10 measurements
                const avgRate = recentRates.reduce((sum, item) => sum + item.rate, 0) / recentRates.length;
                this.metrics.data_rate = avgRate;
            }
        } catch (error) {
            console.error('Error updating transfer rate:', error);
        }
    }

    /**
     * Calculate overall data transfer rate
     */
    calculateDataRate() {
        try {
            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            if (this.metrics.session_start_time && this.metrics.bytes_loaded > 0) {
                const sessionDuration = (currentTime - this.metrics.session_start_time) / 1000; // seconds
                if (sessionDuration > 0) {
                    const totalMB = this.metrics.bytes_loaded / (1024 * 1024);
                    this.metrics.data_rate = totalMB / sessionDuration; // MB/s
                }
            }
        } catch (error) {
            console.error('Error calculating data rate:', error);
        }
    }

    /**
     * Calculate data efficiency (MB per minute of playback)
     */
    calculateDataEfficiency() {
        try {
            if (this.performanceTracker) {
                const playbackMetrics = this.performanceTracker.getPlaybackMetrics();
                if (playbackMetrics && playbackMetrics.total_playback_time > 0) {
                    const playbackMinutes = playbackMetrics.total_playback_time / 60; // Convert to minutes
                    const totalMB = this.metrics.bytes_loaded / (1024 * 1024);
                    this.metrics.data_efficiency = totalMB / playbackMinutes; // MB per minute
                }
            } else {
                // Fallback: use session time if no performance tracker
                let currentTime;
                if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                    currentTime = Date.now();
                } else {
                    currentTime = performance.now();
                }

                if (this.metrics.session_start_time) {
                    const sessionMinutes = (currentTime - this.metrics.session_start_time) / (1000 * 60);
                    if (sessionMinutes > 0) {
                        const totalMB = this.metrics.bytes_loaded / (1024 * 1024);
                        this.metrics.data_efficiency = totalMB / sessionMinutes;
                    }
                }
            }
        } catch (error) {
            console.error('Error calculating data efficiency:', error);
        }
    }

    /**
     * Start real-time updates for data consumption metrics
     */
    startRealTimeUpdates() {
        try {
            // Clear any existing interval
            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
            }

            // Update every 2000ms for data consumption metrics
            this.realTimeUpdateInterval = setInterval(() => {
                this.calculateDataRate();
                this.calculateDataEfficiency();
                this.updateDataDisplay();
            }, 2000);

            console.log('Real-time data consumption updates started');
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
                console.log('Real-time data consumption updates stopped');
            }
        } catch (error) {
            console.error('Error stopping real-time updates:', error);
        }
    }

    /**
     * Get current data consumption metrics
     */
    getDataMetrics() {
        return {
            total_data_loaded: this.metrics.total_data_loaded,
            data_rate: this.metrics.data_rate,
            data_efficiency: this.metrics.data_efficiency,
            bytes_loaded: this.metrics.bytes_loaded,
            data_history: [...this.metrics.data_history],
            transfer_rates: [...this.metrics.transfer_rates]
        };
    }

    /**
     * Update data consumption display in the UI
     */
    updateDataDisplay() {
        try {
            // Find or create data consumption metrics panel
            let dataPanel = document.getElementById('dataConsumptionPanel');

            if (!dataPanel) {
                this.createDataPanel();
                dataPanel = document.getElementById('dataConsumptionPanel');
            }

            if (dataPanel) {
                const totalDataElement = dataPanel.querySelector('#totalDataValue');
                const dataRateElement = dataPanel.querySelector('#dataRateValue');
                const dataEfficiencyElement = dataPanel.querySelector('#dataEfficiencyValue');
                const dataStatusElement = dataPanel.querySelector('#dataStatus');
                const bytesLoadedElement = dataPanel.querySelector('#bytesLoadedValue');
                const transferRateElement = dataPanel.querySelector('#transferRateValue');

                if (totalDataElement) {
                    totalDataElement.textContent = this.metrics.total_data_loaded.toFixed(3) + ' GB';

                    // Add visual indicators based on data consumption
                    totalDataElement.className = 'info-item__value';
                    if (this.metrics.total_data_loaded > 5) {
                        totalDataElement.classList.add('data-high');
                        totalDataElement.title = 'High data consumption (>5 GB)';
                    } else if (this.metrics.total_data_loaded > 2) {
                        totalDataElement.classList.add('data-medium');
                        totalDataElement.title = 'Moderate data consumption (2-5 GB)';
                    } else if (this.metrics.total_data_loaded > 0) {
                        totalDataElement.classList.add('data-low');
                        totalDataElement.title = 'Low data consumption (<2 GB)';
                    }
                }

                if (dataRateElement) {
                    dataRateElement.textContent = this.metrics.data_rate.toFixed(2) + ' MB/s';

                    // Add visual indicators based on transfer rate
                    dataRateElement.className = 'info-item__value';
                    if (this.metrics.data_rate > 10) {
                        dataRateElement.classList.add('rate-high');
                        dataRateElement.title = 'High transfer rate (>10 MB/s)';
                    } else if (this.metrics.data_rate > 5) {
                        dataRateElement.classList.add('rate-medium');
                        dataRateElement.title = 'Moderate transfer rate (5-10 MB/s)';
                    } else if (this.metrics.data_rate > 0) {
                        dataRateElement.classList.add('rate-low');
                        dataRateElement.title = 'Low transfer rate (<5 MB/s)';
                    }
                }

                if (dataEfficiencyElement) {
                    dataEfficiencyElement.textContent = this.metrics.data_efficiency.toFixed(2) + ' MB/min';

                    // Add visual indicators based on efficiency
                    dataEfficiencyElement.className = 'info-item__value';
                    if (this.metrics.data_efficiency > 100) {
                        dataEfficiencyElement.classList.add('efficiency-high');
                        dataEfficiencyElement.title = 'High data usage per minute (>100 MB/min)';
                    } else if (this.metrics.data_efficiency > 50) {
                        dataEfficiencyElement.classList.add('efficiency-medium');
                        dataEfficiencyElement.title = 'Moderate data usage per minute (50-100 MB/min)';
                    } else if (this.metrics.data_efficiency > 0) {
                        dataEfficiencyElement.classList.add('efficiency-low');
                        dataEfficiencyElement.title = 'Low data usage per minute (<50 MB/min)';
                    }
                }

                if (dataStatusElement) {
                    if (this.hlsInstance && this.metrics.data_rate > 0) {
                        dataStatusElement.textContent = 'Active';
                        dataStatusElement.className = 'info-item__value data-active';
                    } else if (this.hlsInstance) {
                        dataStatusElement.textContent = 'Ready';
                        dataStatusElement.className = 'info-item__value data-ready';
                    } else {
                        dataStatusElement.textContent = 'Waiting for stream...';
                        dataStatusElement.className = 'info-item__value data-waiting';
                    }
                }

                if (bytesLoadedElement) {
                    const mb = this.metrics.bytes_loaded / (1024 * 1024);
                    bytesLoadedElement.textContent = mb.toFixed(2) + ' MB';
                }

                if (transferRateElement) {
                    if (this.metrics.transfer_rates.length > 0) {
                        const recentRate = this.metrics.transfer_rates[this.metrics.transfer_rates.length - 1];
                        transferRateElement.textContent = recentRate.rate.toFixed(2) + ' MB/s';
                    } else {
                        transferRateElement.textContent = 'Measuring...';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating data display:', error);
        }
    }

    /**
     * Create data consumption metrics panel in dashboard
     */
    createDataPanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) {
                console.warn('Dashboard grid not found, cannot create data panel');
                return;
            }

            const dataPanel = document.createElement('article');
            dataPanel.className = 'card';
            dataPanel.id = 'dataConsumptionPanel';

            dataPanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-download"></i>
                        Data Consumption & Transfer
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Total Data Loaded:</span>
                            <span class="info-item__value" id="totalDataValue">0.000 GB</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Data Rate:</span>
                            <span class="info-item__value" id="dataRateValue">0.00 MB/s</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Data Efficiency:</span>
                            <span class="info-item__value" id="dataEfficiencyValue">0.00 MB/min</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Status:</span>
                            <span class="info-item__value" id="dataStatus">Idle</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Bytes Loaded:</span>
                            <span class="info-item__value" id="bytesLoadedValue">0.00 MB</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Current Transfer:</span>
                            <span class="info-item__value" id="transferRateValue">Measuring...</span>
                        </div>
                    </div>
                </div>
            `;

            // Insert after existing panels
            dashboardGrid.appendChild(dataPanel);

            console.log('Data consumption metrics panel created');
        } catch (error) {
            console.error('Error creating data panel:', error);
        }
    }

    /**
     * Reset data consumption metrics for new session
     */
    resetDataMetrics() {
        try {
            this.stopRealTimeUpdates();

            this.metrics = {
                total_data_loaded: 0,
                data_rate: 0,
                data_efficiency: 0,
                bytes_loaded: 0,
                session_start_time: null,
                last_update_time: null,
                data_history: [],
                transfer_rates: []
            };

            this.lastFragmentTime = null;
            this.lastFragmentBytes = 0;

            this.updateDataDisplay();
            console.log('Data consumption metrics reset');
        } catch (error) {
            console.error('Error resetting data metrics:', error);
        }
    }

    /**
     * Setup network interception to track all HTTP requests
     */
    setupNetworkInterception() {
        try {
            // Store original XMLHttpRequest
            const originalXHR = window.XMLHttpRequest;
            const self = this;

            // Override XMLHttpRequest to track data consumption
            window.XMLHttpRequest = function () {
                const xhr = new originalXHR();
                const originalOpen = xhr.open;
                const originalSend = xhr.send;

                let requestUrl = '';
                let startTime = 0;

                // Override open to capture URL
                xhr.open = function (method, url, ...args) {
                    requestUrl = url;
                    return originalOpen.apply(this, [method, url, ...args]);
                };

                // Override send to track timing
                xhr.send = function (...args) {
                    startTime = performance.now();
                    return originalSend.apply(this, args);
                };

                // Track response data
                xhr.addEventListener('loadend', function () {
                    try {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            const responseSize = xhr.response ? xhr.response.byteLength || xhr.responseText?.length || 0 : 0;
                            const endTime = performance.now();
                            const loadTime = (endTime - startTime) / 1000; // seconds

                            // Only track HLS-related requests
                            if (requestUrl && (requestUrl.includes('.m3u8') || requestUrl.includes('.ts') || requestUrl.includes('.mp4'))) {
                                if (responseSize > 0) {
                                    self.addDataLoaded(responseSize);

                                    // Calculate transfer rate
                                    if (loadTime > 0) {
                                        const transferRateMBps = (responseSize / (1024 * 1024)) / loadTime;
                                        self.updateTransferRate(transferRateMBps);
                                    }

                                    console.log(`Network request tracked: ${requestUrl.split('/').pop()} - ${(responseSize / 1024 / 1024).toFixed(2)} MB in ${loadTime.toFixed(2)}s`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error tracking network request:', error);
                    }
                });

                return xhr;
            };

            // Also intercept fetch API
            const originalFetch = window.fetch;
            window.fetch = function (url, options = {}) {
                const startTime = performance.now();

                return originalFetch(url, options).then(response => {
                    try {
                        if (response.ok && (url.includes('.m3u8') || url.includes('.ts') || url.includes('.mp4'))) {
                            const contentLength = response.headers.get('content-length');
                            if (contentLength) {
                                const responseSize = parseInt(contentLength);
                                const endTime = performance.now();
                                const loadTime = (endTime - startTime) / 1000;

                                self.addDataLoaded(responseSize);

                                if (loadTime > 0) {
                                    const transferRateMBps = (responseSize / (1024 * 1024)) / loadTime;
                                    self.updateTransferRate(transferRateMBps);
                                }

                                console.log(`Fetch request tracked: ${url.split('/').pop()} - ${(responseSize / 1024 / 1024).toFixed(2)} MB in ${loadTime.toFixed(2)}s`);
                            }
                        }
                    } catch (error) {
                        console.error('Error tracking fetch request:', error);
                    }
                    return response;
                });
            };

            console.log('Network interception setup complete');
        } catch (error) {
            console.error('Error setting up network interception:', error);
        }
    }

    /**
     * Test method to simulate data loading (for debugging)
     */
    simulateDataLoading() {
        try {
            // Simulate some data loading for testing
            const testBytes = 1024 * 1024 * 2; // 2MB
            this.addDataLoaded(testBytes);
            this.updateTransferRate(5.5); // 5.5 MB/s
            console.log('Simulated data loading for testing');
        } catch (error) {
            console.error('Error simulating data loading:', error);
        }
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            hasHLSInstance: !!this.hlsInstance,
            hasPerformanceTracker: !!this.performanceTracker,
            isRealTimeUpdating: !!this.realTimeUpdateInterval,
            sessionStartTime: this.metrics.session_start_time,
            metrics: { ...this.metrics }
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.stopRealTimeUpdates();
            console.log('DataConsumptionTracker cleanup completed');
        } catch (error) {
            console.error('Error during DataConsumptionTracker cleanup:', error);
        }
    }
}