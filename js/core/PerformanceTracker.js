/**
 * PerformanceTracker - Đo lường hiệu suất startup và các metrics khác
 */
export default class PerformanceTracker {
    constructor() {
        this.metrics = {
            startup: {
                startup_time: null,
                play_start_time: null,
                first_frame_time: null,
                timestamp: null
            },
            rebuffering: {
                rebuffer_count: 0,
                rebuffer_duration: 0,
                rebuffer_ratio: 0,
                current_rebuffer_start: null,
                watch_time_start: null,
                total_watch_time: 0,
                last_rebuffer_time: null,
                // Thêm các field để track state chuẩn hơn
                is_first_playing: true, // Track startup vs rebuffer
                last_timeupdate_time: null,
                last_current_time: 0,
                min_rebuffer_duration: 250, // ms - bỏ qua stall ngắn
                watch_time_accumulated: 0, // Tích lũy watch time khi pause/visibility change
                last_watch_time_checkpoint: null
            },
            bitrate: {
                current_bitrate: 0,
                average_bitrate: 0,
                max_bitrate: 0,
                bitrate_history: [],
                bitrate_sum: 0,
                bitrate_count: 0
            },
            bandwidth: {
                current_bandwidth: 0,
                bandwidth_history: [],
                last_bandwidth_update: null
            },
            buffer: {
                buffer_length: 0,
                last_buffer_update: null
            },

            frames: {
                dropped_frames: 0,
                total_frames: 0,
                dropped_frame_ratio: 0,
                last_update: null,
                video_element: null
            },
            fps: {
                current_fps: 0,
                min_fps: null,
                max_fps: 0,
                avg_fps: 0,
                fps_samples: [],
                last_frame_time: null,
                frame_count: 0,
                measurement_start_time: null,
                last_display_update: null
            },
            segments: {
                max_segment_duration: 0,
                min_segment_duration: null,
                avg_segment_duration: 0,
                total_segment_duration: 0,
                segment_count: 0,
                avg_segment_load_time: 0,
                min_segment_loadtime: null,
                max_segment_loadtime: 0,
                total_segment_load_time: 0,
                total_segment_loaded: 0,
                segment_durations: [],
                segment_load_times: [],
                last_segment_time: null
            },
            playback: {
                watch_time: 0,
                playback_ratio: 0,
                is_playing: false,
                is_paused: false,
                is_buffering: false,
                playback_start_time: null,
                session_start_time: null
            }
        };

        this.isStartupMeasurementActive = false;
        this.isRebufferingActive = false;
        this.realTimeUpdateInterval = null;
        this.playbackUpdateInterval = null;
        this.frameStatsInterval = null;
        this.fpsAnimationFrame = null;
        this.fpsVideoInterval = null;
        this.segmentUpdateInterval = null;

        // State tracking cho rebuffer logic chuẩn
        this.videoElement = null;
        this.isWaitingForBuffer = false;
        this.rebufferStartTime = null;
        this.boundEventHandlers = null;

        console.log('PerformanceTracker initialized');
    }

    /**
     * Set video element để track events chuẩn
     */
    setVideoElement(videoElement) {
        this.videoElement = videoElement;

        this.setupVideoEventListeners();
    }

    /**
     * Set HLS instance để track bitrate và bandwidth
     */
    setHLSInstance(hlsInstance) {
        this.hlsInstance = hlsInstance;
        this.setupHLSEventListeners();
    }

    /**
     * Setup HLS event listeners để track bitrate và bandwidth
     */
    setupHLSEventListeners() {
        if (!this.hlsInstance) {
            console.warn('No HLS instance available for bitrate tracking');
            return;
        }

        try {
            // Check if Hls is available globally
            if (typeof Hls === 'undefined') {
                console.warn('Hls not available globally, using string events');

                // Use string event names as fallback
                this.hlsInstance.on('hlsLevelSwitched', (event, data) => {
                    console.log('Level switched (string event):', data);
                    if (data.level !== undefined && this.hlsInstance.levels && this.hlsInstance.levels[data.level]) {
                        const level = this.hlsInstance.levels[data.level];
                        console.log('Updating bitrate from level switch (string):', level.bitrate);
                        this.updateBitrateMetrics(level.bitrate);
                    }
                });

                this.hlsInstance.on('hlsFragLoaded', (event, data) => {
                    if (data.frag && data.frag.stats) {
                        const stats = data.frag.stats;
                        if (stats.total && stats.loading && stats.loading.end && stats.loading.start) {
                            const duration = (stats.loading.end - stats.loading.start) / 1000;
                            const bytes = stats.total;
                            const bandwidth = (bytes * 8) / duration;
                            this.updateBandwidthMetrics(bandwidth);
                        }
                    }
                });
            } else {
                // Use Hls.Events constants
                this.hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                    console.log('Level switched event:', data);
                    if (data.level !== undefined && this.hlsInstance.levels && this.hlsInstance.levels[data.level]) {
                        const level = this.hlsInstance.levels[data.level];
                        console.log('Updating bitrate from level switch:', level.bitrate);
                        this.updateBitrateMetrics(level.bitrate);
                    }
                });

                // Also listen for LEVEL_LOADED to get initial bitrate
                this.hlsInstance.on(Hls.Events.LEVEL_LOADED, (event, data) => {
                    console.log('Level loaded event:', data);
                    if (data.level !== undefined && this.hlsInstance.levels && this.hlsInstance.levels[data.level]) {
                        const level = this.hlsInstance.levels[data.level];
                        console.log('Updating bitrate from level loaded:', level.bitrate);
                        this.updateBitrateMetrics(level.bitrate);
                    }
                });

                this.hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
                    console.log('✅Fragment loaded event:', data);
                    if (data.frag && data.frag.stats) {
                        const stats = data.frag.stats;
                        if (stats.total && stats.loading && stats.loading.end && stats.loading.start) {
                            const duration = (stats.loading.end - stats.loading.start) / 1000;
                            const bytes = stats.total;
                            const bandwidth = (bytes * 8) / duration;
                            const bandwidthMbps = Math.round(bandwidth / 1000000); // Mbps
                            console.log('Updating bandwidth from fragment:', bandwidthMbps);
                            // this.updateBandwidthMetrics(bandwidthMbps); //bps
                        }
                    }
                });
            }

            // Also try to get current level immediately if available
            if (this.hlsInstance.levels && this.hlsInstance.currentLevel >= 0) {
                const currentLevel = this.hlsInstance.levels[this.hlsInstance.currentLevel];
                if (currentLevel && currentLevel.bitrate) {
                    console.log('Setting initial bitrate:', currentLevel.bitrate);
                    this.updateBitrateMetrics(currentLevel.bitrate);
                }
            }

            // Set up periodic bitrate check in case events don't fire
            this.bitrateCheckInterval = setInterval(() => {
                this.checkCurrentBitrate();
            }, 5000); // Check every 5 seconds

            console.log('HLS event listeners setup for bitrate/bandwidth tracking');
        } catch (error) {
            console.error('Error setting up HLS event listeners:', error);
        }
    }

    /**
     * Setup event listeners cho rebuffering detection chuẩn
     */
    setupVideoEventListeners() {
        if (!this.videoElement) return;

        // Remove existing listeners to avoid duplicates
        this.removeVideoEventListeners();

        console.log('Setting up PerformanceTracker video event listeners');

        // Store bound functions for removal later
        this.boundEventHandlers = {
            waiting: (e) => this.onVideoWaiting(e),
            stalled: (e) => this.onVideoStalled(e),
            playing: (e) => this.onVideoPlaying(e),
            timeupdate: (e) => this.onVideoTimeUpdate(e),
            pause: (e) => this.onVideoPause(e),
            play: (e) => this.onVideoPlay(e),
            seeking: (e) => this.onVideoSeeking(e),
            seeked: (e) => this.onVideoSeeked(e),
            visibilitychange: () => this.onVisibilityChange()
        };

        // Event để detect rebuffer start
        this.videoElement.addEventListener('waiting', this.boundEventHandlers.waiting);
        this.videoElement.addEventListener('stalled', this.boundEventHandlers.stalled);

        // Event để detect rebuffer end
        this.videoElement.addEventListener('playing', this.boundEventHandlers.playing);
        this.videoElement.addEventListener('timeupdate', this.boundEventHandlers.timeupdate);

        // Track pause/play cho watch time
        this.videoElement.addEventListener('pause', this.boundEventHandlers.pause);
        this.videoElement.addEventListener('play', this.boundEventHandlers.play);

        // Track seeking để loại trừ khỏi rebuffer
        this.videoElement.addEventListener('seeking', this.boundEventHandlers.seeking);
        this.videoElement.addEventListener('seeked', this.boundEventHandlers.seeked);

        // Track visibility change để preserve watch time
        document.addEventListener('visibilitychange', this.boundEventHandlers.visibilitychange);

        console.log('PerformanceTracker event listeners setup complete');
    }

    /**
     * Remove event listeners to avoid duplicates
     */
    removeVideoEventListeners() {
        if (!this.videoElement || !this.boundEventHandlers) return;

        console.log('Removing existing PerformanceTracker event listeners');

        this.videoElement.removeEventListener('waiting', this.boundEventHandlers.waiting);
        this.videoElement.removeEventListener('stalled', this.boundEventHandlers.stalled);
        this.videoElement.removeEventListener('playing', this.boundEventHandlers.playing);
        this.videoElement.removeEventListener('timeupdate', this.boundEventHandlers.timeupdate);
        this.videoElement.removeEventListener('pause', this.boundEventHandlers.pause);
        this.videoElement.removeEventListener('play', this.boundEventHandlers.play);
        this.videoElement.removeEventListener('seeking', this.boundEventHandlers.seeking);
        this.videoElement.removeEventListener('seeked', this.boundEventHandlers.seeked);
        document.removeEventListener('visibilitychange', this.boundEventHandlers.visibilitychange);
    }

    /**
     * Handle video waiting event - potential rebuffer start
     */
    onVideoWaiting(event) {
        if (!this.videoElement) return;

        // Kiểm tra điều kiện rebuffer chuẩn:
        // 1. Không phải paused
        // 2. Không phải seeking  
        // 3. readyState < HAVE_FUTURE_DATA (3)
        const isPaused = this.videoElement.paused;
        const isSeeking = this.videoElement.seeking;
        const readyState = this.videoElement.readyState;
        const isFirstPlaying = this.metrics.rebuffering.is_first_playing;

        console.log('Video waiting event:', {
            paused: isPaused,
            seeking: isSeeking,
            readyState: readyState,
            isFirstPlaying: isFirstPlaying
        });

        // Loại trừ startup delay (trước lần playing đầu tiên)
        if (isFirstPlaying) {
            console.log('Ignoring waiting during startup');
            return;
        }

        // Loại trừ pause và seeking
        if (isPaused || isSeeking) {
            console.log('Ignoring waiting during pause/seek');
            return;
        }

        // Kiểm tra readyState
        if (readyState >= 3) { // HAVE_FUTURE_DATA
            console.log('Ignoring waiting - sufficient data available');
            return;
        }

        // Đây là rebuffer thật sự
        this.startRebufferMeasurement();
    }

    /**
     * Handle video stalled event - backup cho waiting
     */
    onVideoStalled(event) {
        // Tương tự logic như waiting
        this.onVideoWaiting(event);
    }

    /**
     * Handle video playing event - potential rebuffer end
     */
    onVideoPlaying(event) {
        console.log('PerformanceTracker: onVideoPlaying called', {
            isFirstPlaying: this.metrics.rebuffering.is_first_playing,
            isWaitingForBuffer: this.isWaitingForBuffer
        });

        // Đánh dấu đã qua startup
        if (this.metrics.rebuffering.is_first_playing) {
            this.metrics.rebuffering.is_first_playing = false;
            console.log('First playing event - startup complete, status should change to Playing');

            // Force update display immediately
            this.updateRebufferDisplay();
        }

        // Kết thúc rebuffer nếu đang active
        if (this.isWaitingForBuffer) {
            this.endRebufferMeasurement();
        }

        // Resume watch time tracking
        this.resumeWatchTime();
    }

    /**
     * Handle timeupdate - detect playback progress để confirm rebuffer end
     */
    onVideoTimeUpdate(event) {
        if (!this.videoElement) return;

        const currentTime = this.videoElement.currentTime;
        const now = performance.now();

        // Kiểm tra xem currentTime có tăng không (playback progress)
        if (this.metrics.rebuffering.last_current_time !== currentTime) {
            this.metrics.rebuffering.last_current_time = currentTime;
            this.metrics.rebuffering.last_timeupdate_time = now;

            // Nếu đang rebuffer và thấy progress, kết thúc rebuffer
            if (this.isWaitingForBuffer) {
                console.log('Timeupdate detected progress during rebuffer - ending rebuffer');
                this.endRebufferMeasurement();
            }
        }

        // Update watch time continuously
        this.updateWatchTimeFromTimeUpdate();
    }

    /**
     * Bắt đầu đo rebuffer với validation thời gian tối thiểu
     */
    startRebufferMeasurement() {
        if (this.isWaitingForBuffer) {
            console.log('Already measuring rebuffer');
            return;
        }

        this.rebufferStartTime = performance.now();
        this.isWaitingForBuffer = true;

        console.log('Rebuffer measurement started');

        // Set timeout để validate minimum duration
        setTimeout(() => {
            this.validateRebufferDuration();
        }, this.metrics.rebuffering.min_rebuffer_duration);
    }

    /**
     * Validate rebuffer duration - bỏ qua nếu quá ngắn
     */
    validateRebufferDuration() {
        if (!this.isWaitingForBuffer || !this.rebufferStartTime) return;

        const duration = performance.now() - this.rebufferStartTime;

        if (duration < this.metrics.rebuffering.min_rebuffer_duration) {
            console.log(`Rebuffer too short (${duration}ms), ignoring`);
            this.isWaitingForBuffer = false;
            this.rebufferStartTime = null;
            return;
        }

        // Nếu vẫn đang rebuffer sau min duration, count nó
        if (this.isWaitingForBuffer) {
            this.metrics.rebuffering.rebuffer_count++;
            console.log(`Valid rebuffer detected, count: ${this.metrics.rebuffering.rebuffer_count}`);
        }
    }

    /**
     * Kết thúc đo rebuffer
     */
    endRebufferMeasurement() {
        if (!this.isWaitingForBuffer || !this.rebufferStartTime) return;

        const duration = performance.now() - this.rebufferStartTime;

        // Chỉ tính nếu đủ thời gian tối thiểu
        if (duration >= this.metrics.rebuffering.min_rebuffer_duration) {
            this.metrics.rebuffering.rebuffer_duration += duration / 1000; // Convert to seconds
            console.log(`Rebuffer ended. Duration: ${(duration / 1000).toFixed(2)}s`);
        }

        this.isWaitingForBuffer = false;
        this.rebufferStartTime = null;
        this.updateRebufferDisplay();
    }

    /**
     * Handle video pause - checkpoint watch time
     */
    onVideoPause(event) {
        this.checkpointWatchTime();
    }

    /**
     * Handle video play - resume watch time
     */
    onVideoPlay(event) {
        this.resumeWatchTime();
    }

    /**
     * Handle seeking start
     */
    onVideoSeeking(event) {
        // Pause watch time during seek
        this.checkpointWatchTime();
    }

    /**
     * Handle seeking end
     */
    onVideoSeeked(event) {
        // Resume watch time after seek
        this.resumeWatchTime();
    }

    /**
     * Handle visibility change - preserve watch time khi rời tab
     */
    onVisibilityChange() {
        if (document.hidden) {
            // Tab bị ẩn - checkpoint watch time để preserve
            this.checkpointWatchTime();
            console.log('Tab hidden - watch time checkpointed and preserved');
        } else {
            // Tab được focus lại - chỉ resume nếu video đang play
            if (this.videoElement && !this.videoElement.paused && !this.videoElement.seeking) {
                this.resumeWatchTime();
                console.log('Tab visible - watch time resumed from checkpoint');
            } else {
                console.log('Tab visible - but video is paused/seeking, not resuming watch time');
            }
        }
    }

    /**
     * Checkpoint watch time - lưu giá trị hiện tại
     */
    checkpointWatchTime() {
        if (this.metrics.rebuffering.watch_time_start) {
            const elapsed = (performance.now() - this.metrics.rebuffering.watch_time_start) / 1000;
            this.metrics.rebuffering.watch_time_accumulated += elapsed;
            this.metrics.rebuffering.total_watch_time = this.metrics.rebuffering.watch_time_accumulated;
            this.metrics.rebuffering.watch_time_start = null;
        }
    }

    /**
     * Resume watch time - tiếp tục từ checkpoint
     */
    resumeWatchTime() {
        if (!this.videoElement || this.videoElement.paused || this.videoElement.seeking || document.hidden) {
            console.log('Cannot resume watch time:', {
                hasVideo: !!this.videoElement,
                paused: this.videoElement?.paused,
                seeking: this.videoElement?.seeking,
                hidden: document.hidden
            });
            return;
        }

        this.metrics.rebuffering.watch_time_start = performance.now();

    }

    /**
     * Update watch time từ timeupdate event
     */
    updateWatchTimeFromTimeUpdate() {


        // Chỉ update watch time nếu video đang play (không pause, không seeking)
        if (this.metrics.rebuffering.watch_time_start &&
            this.videoElement &&
            !this.videoElement.paused &&
            !this.videoElement.seeking) {

            const currentWatchTime = (performance.now() - this.metrics.rebuffering.watch_time_start) / 1000;
            this.metrics.rebuffering.total_watch_time = this.metrics.rebuffering.watch_time_accumulated + currentWatchTime;





            // Recalculate rebuffer ratio
            if (this.metrics.rebuffering.total_watch_time > 0) {
                this.metrics.rebuffering.rebuffer_ratio =
                    (this.metrics.rebuffering.rebuffer_duration / this.metrics.rebuffering.total_watch_time) * 100;
            }
        }
    }

    /**
     * Bắt đầu đo startup time khi play() được gọi
     */
    startStartupMeasurement() {
        try {
            // Kiểm tra performance.now() có sẵn không
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                console.warn('High-precision timing not available, falling back to Date.now()');
                this.metrics.startup.play_start_time = Date.now();
            } else {
                this.metrics.startup.play_start_time = performance.now();
            }

            this.metrics.startup.first_frame_time = null;
            this.metrics.startup.startup_time = null;
            this.isStartupMeasurementActive = true;

            console.log('Startup measurement started at:', this.metrics.startup.play_start_time);
            this.updateStartupDisplay();
        } catch (error) {
            console.error('Error starting startup measurement:', error);
        }
    }

    /**
     * Ghi nhận khi frame đầu tiên được render
     */
    recordFirstFrame() {
        try {
            if (!this.isStartupMeasurementActive || this.metrics.startup.first_frame_time) {
                return; // Đã ghi nhận hoặc không đang đo
            }

            // Sử dụng cùng phương thức timing như startup measurement
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.startup.first_frame_time = Date.now();
            } else {
                this.metrics.startup.first_frame_time = performance.now();
            }

            if (this.metrics.startup.play_start_time) {
                this.metrics.startup.startup_time = this.metrics.startup.first_frame_time - this.metrics.startup.play_start_time;
                this.metrics.startup.timestamp = Date.now();
                this.isStartupMeasurementActive = false;

                console.log('First frame rendered. Startup time:', this.metrics.startup.startup_time + 'ms');
                this.updateStartupDisplay();
            }
        } catch (error) {
            console.error('Error recording first frame:', error);
        }
    }

    /**
     * Lấy metrics startup hiện tại
     */
    getStartupMetrics() {
        return { ...this.metrics.startup };
    }

    /**
     * Cập nhật hiển thị metrics startup trong overview panel
     */
    updateStartupDisplay() {
        try {
            // Tìm hoặc tạo overview panel
            let overviewPanel = document.getElementById('overviewMetricsPanel');

            if (!overviewPanel) {
                this.createOverviewPanel();
                overviewPanel = document.getElementById('overviewMetricsPanel');
            }

            if (overviewPanel) {
                const startupTimeElement = overviewPanel.querySelector('#startupTimeValue');
                const statusElement = overviewPanel.querySelector('#startupStatus');

                if (this.isStartupMeasurementActive) {
                    if (statusElement) {
                        statusElement.textContent = 'Measuring...';
                        statusElement.className = 'info-item__value startup-measuring';
                    }
                    if (startupTimeElement) {
                        startupTimeElement.textContent = 'Measuring...';
                        startupTimeElement.className = 'info-item__value startup-measuring';
                    }
                } else if (this.metrics.startup.startup_time !== null) {
                    if (statusElement) {
                        statusElement.textContent = 'Complete';
                        statusElement.className = 'info-item__value';
                    }
                    if (startupTimeElement) {
                        startupTimeElement.textContent = this.metrics.startup.startup_time.toFixed(2) + ' ms';
                        startupTimeElement.className = 'info-item__value startup-complete';
                    }
                } else {
                    if (statusElement) {
                        statusElement.textContent = 'Ready';
                        statusElement.className = 'info-item__value';
                    }
                    if (startupTimeElement) {
                        startupTimeElement.textContent = '-';
                        startupTimeElement.className = 'info-item__value';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating startup display:', error);
        }
    }

    /**
     * Tạo overview panel tổng hợp thay thế startup và stream performance panels
     */
    createOverviewPanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) {
                console.warn('Dashboard grid not found, cannot create overview panel');
                return;
            }

            // Xóa các panel cũ nếu tồn tại
            const existingStartup = document.getElementById('startupMetricsPanel');
            const existingRebuffer = document.getElementById('rebufferMetricsPanel');
            if (existingStartup) existingStartup.remove();
            if (existingRebuffer) existingRebuffer.remove();

            const overviewPanel = document.createElement('article');
            overviewPanel.className = 'card';
            overviewPanel.id = 'overviewMetricsPanel';

            overviewPanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-chart-line"></i>
                        Performance Overview
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Startup Time:</span>
                            <span class="info-item__value" id="startupTimeValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Status:</span>
                            <span class="info-item__value" id="startupStatus">Ready</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Current Bitrate:</span>
                            <span class="info-item__value" id="currentBitrateValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Average Bitrate:</span>
                            <span class="info-item__value" id="averageBitrateValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Max Bitrate:</span>
                            <span class="info-item__value" id="maxBitrateValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Current Bandwidth:</span>
                            <span class="info-item__value" id="currentBandwidthValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Buffer Length:</span>
                            <span class="info-item__value" id="bufferLengthValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Rebuffer Count:</span>
                            <span class="info-item__value" id="rebufferCountValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Rebuffer Ratio:</span>
                            <span class="info-item__value" id="rebufferRatioValue">0.00 %</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Watch Time:</span>
                            <span class="info-item__value" id="watchTimeValue">0s</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Stream Quality:</span>
                            <span class="info-item__value" id="streamQualityValue">-</span>
                        </div>
                    </div>
                </div>
            `;

            // Chèn làm panel đầu tiên trong dashboard
            dashboardGrid.insertBefore(overviewPanel, dashboardGrid.firstChild);

            console.log('Overview metrics panel created');
        } catch (error) {
            console.error('Error creating overview panel:', error);
        }
    }

    /**
     * Tạo startup metrics panel trong dashboard - DEPRECATED
     * Sử dụng createOverviewPanel() thay thế
     */
    createStartupPanel() {
        console.warn('createStartupPanel is deprecated, using createOverviewPanel instead');
        this.createOverviewPanel();
    }

    /**
     * Reset startup metrics cho measurement mới
     */
    resetStartupMetrics() {
        try {
            this.metrics.startup = {
                startup_time: null,
                play_start_time: null,
                first_frame_time: null,
                timestamp: null
            };
            this.isStartupMeasurementActive = false;
            this.updateStartupDisplay();
            console.log('Startup metrics reset');
        } catch (error) {
            console.error('Error resetting startup metrics:', error);
        }
    }

    /**
     * Reset bitrate, bandwidth và buffer metrics
     */
    resetBitrateAndBufferMetrics() {
        try {
            // Clear bitrate check interval
            if (this.bitrateCheckInterval) {
                clearInterval(this.bitrateCheckInterval);
                this.bitrateCheckInterval = null;
            }

            this.metrics.bitrate = {
                current_bitrate: 0,
                average_bitrate: 0,
                max_bitrate: 0,
                bitrate_history: [],
                bitrate_sum: 0,
                bitrate_count: 0
            };

            this.metrics.bandwidth = {
                current_bandwidth: 0,
                bandwidth_history: [],
                last_bandwidth_update: null
            };

            this.metrics.buffer = {
                buffer_length: 0,
                last_buffer_update: null
            };

            console.log('Bitrate, bandwidth and buffer metrics reset');
        } catch (error) {
            console.error('Error resetting bitrate and buffer metrics:', error);
        }
    }

    /**
     * Bắt đầu đo watch time khi video bắt đầu phát
     */
    startWatchTime() {
        try {
            // Chỉ reset nếu chưa có watch time (session mới thật sự)
            const hasExistingWatchTime = this.metrics.rebuffering.watch_time_accumulated > 0 || this.metrics.rebuffering.total_watch_time > 0;

            if (!hasExistingWatchTime) {
                this.metrics.rebuffering.watch_time_accumulated = 0;
                this.metrics.rebuffering.total_watch_time = 0;
            }

            this.metrics.rebuffering.is_first_playing = true;

            // KHÔNG bắt đầu đo ngay - chờ video thực sự play
            this.metrics.rebuffering.watch_time_start = null;

            // Initialize playback session
            this.metrics.playback.session_start_time = performance.now();
            this.metrics.playback.is_playing = false;
            this.metrics.playback.is_paused = false;
            this.metrics.playback.is_buffering = false;
            this.metrics.playback.playback_start_time = null;

            // Start real-time updates for rebuffering metrics
            this.startRealTimeUpdates();


        } catch (error) {
            console.error('Error starting watch time measurement:', error);
        }
    }

    /**
     * Manually update bitrate from HLS instance
     */
    updateBitrateFromHLS() {
        try {
            if (this.hlsInstance) {
                // Update bitrate from current level
                if (this.hlsInstance.levels && this.hlsInstance.currentLevel >= 0) {
                    const currentLevel = this.hlsInstance.levels[this.hlsInstance.currentLevel];
                    if (currentLevel && currentLevel.bitrate) {
                        this.updateBitrateMetrics(currentLevel.bitrate);
                    }
                }

                // Update bandwidth from HLS bandwidth estimate
                if (this.hlsInstance.bandwidthEstimate && this.hlsInstance.bandwidthEstimate > 0) {
                    this.updateBandwidthMetrics(this.hlsInstance.bandwidthEstimate / 1000000); // Mbps
                }
            }
        } catch (error) {
            console.error('Error updating bitrate from HLS:', error);
        }
    }

    /**
     * Bắt đầu cập nhật real-time cho tất cả metrics
     */
    startRealTimeUpdates() {
        try {
            // Clear any existing interval
            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
            }

            // Update every 500ms for smooth real-time display
            this.realTimeUpdateInterval = setInterval(() => {
                this.updateWatchTime();

                // Cập nhật buffer metrics nếu có video element
                if (this.videoElement) {
                    this.updateBufferMetrics(this.videoElement);
                }

                // Manually update bitrate from HLS instance
                this.updateBitrateFromHLS();

                this.updateRebufferDisplay();
            }, 500);

            console.log('Real-time updates started for all metrics');
        } catch (error) {
            console.error('Error starting real-time updates:', error);
        }
    }

    /**
     * Dừng cập nhật real-time
     */
    stopRealTimeUpdates() {
        try {
            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
                this.realTimeUpdateInterval = null;
                console.log('Real-time rebuffering updates stopped');
            }
        } catch (error) {
            console.error('Error stopping real-time updates:', error);
        }
    }

    /**
     * Cập nhật tổng watch time và tính toán rebuffer ratio
     */
    updateWatchTime() {
        try {
            // Chỉ update nếu video đang thực sự play
            if (this.videoElement && !this.videoElement.paused && !this.videoElement.seeking && !document.hidden) {
                this.updateWatchTimeFromTimeUpdate();
            }
        } catch (error) {
            console.error('Error updating watch time:', error);
        }
    }



    /**
     * Xử lý khi buffer stall bắt đầu (rebuffering starts) - DEPRECATED
     * Sử dụng event-based detection thay thế
     */
    onBufferStall() {
        console.warn('onBufferStall is deprecated - using event-based detection');
        // Backward compatibility - trigger manual rebuffer start
        this.startRebufferMeasurement();
    }

    /**
     * Xử lý khi buffer resume (rebuffering ends) - DEPRECATED  
     * Sử dụng event-based detection thay thế
     */
    onBufferResume() {
        console.warn('onBufferResume is deprecated - using event-based detection');
        // Backward compatibility - trigger manual rebuffer end
        this.endRebufferMeasurement();
    }

    /**
     * Lấy rebuffering metrics hiện tại
     */
    getRebufferMetrics() {
        // Update watch time before returning metrics
        this.updateWatchTime();

        // Recalculate ratio if watch time is available
        if (this.metrics.rebuffering.total_watch_time > 0) {
            this.metrics.rebuffering.rebuffer_ratio =
                (this.metrics.rebuffering.rebuffer_duration / this.metrics.rebuffering.total_watch_time) * 100;
        }

        return { ...this.metrics.rebuffering };
    }

    /**
     * Cập nhật bitrate metrics
     */
    updateBitrateMetrics(currentBitrate) {
        try {
            if (currentBitrate && currentBitrate > 0) {
                this.metrics.bitrate.current_bitrate = currentBitrate;

                // Cập nhật max bitrate
                if (currentBitrate > this.metrics.bitrate.max_bitrate) {
                    this.metrics.bitrate.max_bitrate = currentBitrate;
                }

                // Cập nhật average bitrate
                this.metrics.bitrate.bitrate_history.push(currentBitrate);
                this.metrics.bitrate.bitrate_sum += currentBitrate;
                this.metrics.bitrate.bitrate_count++;

                // Giữ lại chỉ 100 giá trị gần nhất để tính average
                if (this.metrics.bitrate.bitrate_history.length > 100) {
                    const removed = this.metrics.bitrate.bitrate_history.shift();
                    this.metrics.bitrate.bitrate_sum -= removed;
                    this.metrics.bitrate.bitrate_count--;
                }

                this.metrics.bitrate.average_bitrate = this.metrics.bitrate.bitrate_sum / this.metrics.bitrate.bitrate_count;
            }
        } catch (error) {
            console.error('Error updating bitrate metrics:', error);
        }
    }

    /**
     * Cập nhật bandwidth metrics
     */
    updateBandwidthMetrics(currentBandwidth) {
        try {
            if (currentBandwidth && currentBandwidth > 0) {
                this.metrics.bandwidth.current_bandwidth = currentBandwidth;
                const now = performance.now();
                this.metrics.bandwidth.last_bandwidth_update = now;

                // Chỉ lưu lịch sử bandwidth mỗi 10 giây
                const lastHistoryTime = this.metrics.bandwidth.bandwidth_history.length > 0
                    ? this.metrics.bandwidth.bandwidth_history[this.metrics.bandwidth.bandwidth_history.length - 1].timestamp
                    : 0;

                if (now - lastHistoryTime >= 10000) { // 10 seconds
                    this.metrics.bandwidth.bandwidth_history.push({
                        value: currentBandwidth,
                        timestamp: now
                    });

                    // Giữ lại chỉ 50 giá trị gần nhất (500 giây = ~8 phút)
                    if (this.metrics.bandwidth.bandwidth_history.length > 50) {
                        this.metrics.bandwidth.bandwidth_history.shift();
                    }
                }
            }
        } catch (error) {
            console.error('Error updating bandwidth metrics:', error);
        }
    }

    /**
     * Cập nhật buffer length metrics
     */
    updateBufferMetrics(videoElement) {
        try {
            if (videoElement && videoElement.buffered && videoElement.buffered.length > 0) {
                const currentTime = videoElement.currentTime;
                let bufferLength = 0;

                // Tìm buffer range chứa current time
                for (let i = 0; i < videoElement.buffered.length; i++) {
                    const start = videoElement.buffered.start(i);
                    const end = videoElement.buffered.end(i);

                    if (currentTime >= start && currentTime <= end) {
                        bufferLength = end - currentTime;
                        break;
                    }
                }

                this.metrics.buffer.buffer_length = bufferLength;
                this.metrics.buffer.last_buffer_update = performance.now();
            }
        } catch (error) {
            console.error('Error updating buffer metrics:', error);
        }
    }

    /**
     * Lấy bitrate metrics hiện tại
     */
    getBitrateMetrics() {
        return { ...this.metrics.bitrate };
    }

    /**
     * Lấy bandwidth metrics hiện tại
     */
    getBandwidthMetrics() {
        return { ...this.metrics.bandwidth };
    }

    /**
     * Check current bitrate from HLS instance
     */
    checkCurrentBitrate() {
        try {
            if (this.hlsInstance && this.hlsInstance.levels && this.hlsInstance.currentLevel >= 0) {
                const currentLevel = this.hlsInstance.levels[this.hlsInstance.currentLevel];
                if (currentLevel && currentLevel.bitrate && currentLevel.bitrate !== this.metrics.bitrate.current_bitrate) {
                    console.log('Periodic bitrate check - updating:', currentLevel.bitrate);
                    this.updateBitrateMetrics(currentLevel.bitrate);
                }
            }
        } catch (error) {
            console.error('Error checking current bitrate:', error);
        }
    }

    /**
     * Lấy buffer metrics hiện tại
     */
    getBufferMetrics() {
        return { ...this.metrics.buffer };
    }

    /**
     * Debug method để kiểm tra HLS instance và bitrate
     */
    debugBitrateTracking() {
        console.log('=== Bitrate Tracking Debug ===');
        console.log('HLS Instance:', !!this.hlsInstance);
        if (this.hlsInstance) {
            console.log('HLS Levels:', this.hlsInstance.levels);
            console.log('Current Level:', this.hlsInstance.currentLevel);
            if (this.hlsInstance.levels && this.hlsInstance.currentLevel >= 0) {
                const currentLevel = this.hlsInstance.levels[this.hlsInstance.currentLevel];
                console.log('Current Level Data:', currentLevel);
            }
        }
        console.log('Current Metrics:', this.metrics.bitrate);
        console.log('==============================');
    }

    /**
     * Format time display - hiển thị giây chẵn, >60s thì hiển thị phút
     */
    formatWatchTime(seconds) {
        const roundedSeconds = Math.floor(seconds);

        if (roundedSeconds < 60) {
            return `${roundedSeconds}s`;
        } else {
            const minutes = Math.floor(roundedSeconds / 60);
            const remainingSeconds = roundedSeconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    }

    /**
     * Cập nhật hiển thị rebuffering metrics trong overview panel
     */
    updateRebufferDisplay() {
        try {
            // Tìm hoặc tạo overview panel
            let overviewPanel = document.getElementById('overviewMetricsPanel');

            if (!overviewPanel) {
                this.createOverviewPanel();
                overviewPanel = document.getElementById('overviewMetricsPanel');
            }

            if (overviewPanel) {
                const rebufferCountElement = overviewPanel.querySelector('#rebufferCountValue');
                const rebufferRatioElement = overviewPanel.querySelector('#rebufferRatioValue');
                const watchTimeElement = overviewPanel.querySelector('#watchTimeValue');
                const streamQualityElement = overviewPanel.querySelector('#streamQualityValue');

                // Bitrate elements
                const currentBitrateElement = overviewPanel.querySelector('#currentBitrateValue');
                const averageBitrateElement = overviewPanel.querySelector('#averageBitrateValue');
                const maxBitrateElement = overviewPanel.querySelector('#maxBitrateValue');

                // Bandwidth element
                const currentBandwidthElement = overviewPanel.querySelector('#currentBandwidthValue');

                // Buffer element
                const bufferLengthElement = overviewPanel.querySelector('#bufferLengthValue');

                if (rebufferCountElement) {
                    rebufferCountElement.textContent = this.metrics.rebuffering.rebuffer_count;

                    // Add visual indicator for frequency
                    rebufferCountElement.className = 'info-item__value';
                    if (this.metrics.rebuffering.rebuffer_count > 10) {
                        rebufferCountElement.classList.add('rebuffer-high');
                        rebufferCountElement.title = 'High rebuffering frequency - ' + this.metrics.rebuffering.rebuffer_count + ' events';
                    } else if (this.metrics.rebuffering.rebuffer_count > 5) {
                        rebufferCountElement.classList.add('rebuffer-medium');
                        rebufferCountElement.title = 'Medium rebuffering frequency - ' + this.metrics.rebuffering.rebuffer_count + ' events';
                    } else if (this.metrics.rebuffering.rebuffer_count > 0) {
                        rebufferCountElement.classList.add('rebuffer-low');
                        rebufferCountElement.title = 'Low rebuffering frequency - ' + this.metrics.rebuffering.rebuffer_count + ' events';
                    } else {
                        rebufferCountElement.title = 'No rebuffering events detected';
                    }
                }

                if (rebufferRatioElement) {
                    rebufferRatioElement.textContent = this.metrics.rebuffering.rebuffer_ratio.toFixed(2) + ' %';

                    // Add visual indicators based on ratio with enhanced thresholds
                    rebufferRatioElement.className = 'info-item__value';
                    if (this.metrics.rebuffering.rebuffer_ratio > 10) {
                        rebufferRatioElement.classList.add('rebuffer-high');
                        rebufferRatioElement.title = 'High rebuffering ratio - poor streaming experience';
                    } else if (this.metrics.rebuffering.rebuffer_ratio > 5) {
                        rebufferRatioElement.classList.add('rebuffer-medium');
                        rebufferRatioElement.title = 'Medium rebuffering ratio - acceptable streaming experience';
                    } else if (this.metrics.rebuffering.rebuffer_ratio > 0) {
                        rebufferRatioElement.classList.add('rebuffer-low');
                        rebufferRatioElement.title = 'Low rebuffering ratio - good streaming experience';
                    } else {
                        rebufferRatioElement.classList.add('rebuffer-low');
                        rebufferRatioElement.title = 'No rebuffering detected - excellent streaming experience';
                    }
                }

                if (watchTimeElement) {
                    const totalWatchTime = this.metrics.rebuffering.total_watch_time;
                    const accumulatedTime = this.metrics.rebuffering.watch_time_accumulated;
                    watchTimeElement.textContent = this.formatWatchTime(totalWatchTime);
                    watchTimeElement.title = `Total: ${totalWatchTime.toFixed(2)}s, Accumulated: ${accumulatedTime.toFixed(2)}s`;
                }

                if (streamQualityElement) {
                    let qualityLevel = 'Unknown';
                    let qualityClass = 'info-item__value';

                    if (this.metrics.rebuffering.rebuffer_ratio === 0 && this.metrics.rebuffering.rebuffer_count === 0) {
                        qualityLevel = 'Excellent';
                        qualityClass += ' rebuffer-low';
                    } else if (this.metrics.rebuffering.rebuffer_ratio <= 2) {
                        qualityLevel = 'Good';
                        qualityClass += ' rebuffer-low';
                    } else if (this.metrics.rebuffering.rebuffer_ratio <= 5) {
                        qualityLevel = 'Fair';
                        qualityClass += ' rebuffer-medium';
                    } else {
                        qualityLevel = 'Poor';
                        qualityClass += ' rebuffer-high';
                    }

                    streamQualityElement.textContent = qualityLevel;
                    streamQualityElement.className = qualityClass;
                }

                // Cập nhật bitrate metrics
                if (currentBitrateElement) {
                    const currentBitrate = this.metrics.bitrate.current_bitrate;
                    if (currentBitrate > 0) {
                        currentBitrateElement.textContent = `${(currentBitrate / 1000000).toFixed(1)} Mbps`;
                    } else {
                        currentBitrateElement.textContent = '-';
                    }
                }

                if (averageBitrateElement) {
                    const avgBitrate = this.metrics.bitrate.average_bitrate;
                    if (avgBitrate > 0) {
                        averageBitrateElement.textContent = `${(avgBitrate / 1000000).toFixed(1)} Mbps`;
                    } else {
                        averageBitrateElement.textContent = '-';
                    }
                }

                if (maxBitrateElement) {
                    const maxBitrate = this.metrics.bitrate.max_bitrate;
                    if (maxBitrate > 0) {
                        maxBitrateElement.textContent = `${(maxBitrate / 1000000).toFixed(1)} Mbps`;
                    } else {
                        maxBitrateElement.textContent = '-';
                    }
                }

                // Cập nhật bandwidth metrics
                if (currentBandwidthElement) {
                    const currentBandwidth = this.metrics.bandwidth.current_bandwidth;
                    if (currentBandwidth > 0) {
                        currentBandwidthElement.textContent = `${currentBandwidth.toFixed(1)} Mbps`;
                    } else {
                        currentBandwidthElement.textContent = '-';
                    }
                }

                // Cập nhật buffer metrics
                if (bufferLengthElement) {
                    const bufferLength = this.metrics.buffer.buffer_length;
                    if (bufferLength > 0) {
                        bufferLengthElement.textContent = `${bufferLength.toFixed(1)} s`;

                        // Thêm color coding cho buffer health
                        bufferLengthElement.className = 'info-item__value';
                        if (bufferLength > 10) {
                            bufferLengthElement.classList.add('rebuffer-low');
                            bufferLengthElement.title = 'Healthy buffer - excellent streaming experience';
                        } else if (bufferLength > 5) {
                            bufferLengthElement.classList.add('rebuffer-medium');
                            bufferLengthElement.title = 'Good buffer - stable streaming';
                        } else if (bufferLength > 2) {
                            bufferLengthElement.classList.add('rebuffer-medium');
                            bufferLengthElement.title = 'Low buffer - may experience rebuffering';
                        } else {
                            bufferLengthElement.classList.add('rebuffer-high');
                            bufferLengthElement.title = 'Critical buffer - high risk of rebuffering';
                        }
                    } else {
                        bufferLengthElement.textContent = '-';
                        bufferLengthElement.className = 'info-item__value';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating rebuffer display:', error);
        }
    }



    /**
     * Tạo rebuffering metrics panel trong dashboard - DEPRECATED
     * Sử dụng createOverviewPanel() thay thế
     */
    createRebufferPanel() {
        console.warn('createRebufferPanel is deprecated, using createOverviewPanel instead');
        // Không tạo panel riêng nữa, sử dụng overview panel
        return;
    }

    /**
     * Reset rebuffering metrics cho session mới
     */
    resetRebufferMetrics() {
        try {
            // Stop real-time updates
            this.stopRealTimeUpdates();

            // Preserve watch time accumulated khi reset
            const preservedWatchTime = this.metrics.rebuffering.watch_time_accumulated || 0;
            const preservedTotalTime = this.metrics.rebuffering.total_watch_time || 0;



            this.metrics.rebuffering = {
                rebuffer_count: 0,
                rebuffer_duration: 0,
                rebuffer_ratio: 0,
                current_rebuffer_start: null,
                watch_time_start: null,
                total_watch_time: preservedTotalTime,
                last_rebuffer_time: null,
                // Reset các field mới
                is_first_playing: true,
                last_timeupdate_time: null,
                last_current_time: 0,
                min_rebuffer_duration: 250,
                watch_time_accumulated: preservedWatchTime,
                last_watch_time_checkpoint: null
            };

            // Reset state tracking
            this.isRebufferingActive = false;
            this.isWaitingForBuffer = false;
            this.rebufferStartTime = null;

            this.updateRebufferDisplay();

            // Playback metrics reset removed - total_playback_time no longer used

            console.log('Rebuffering metrics reset with new logic');
        } catch (error) {
            console.error('Error resetting rebuffering metrics:', error);
        }
    }





    /**
     * Resume playback time tracking when video resumes from pause
     */
    resumePlaybackTimer() {
        try {
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.playback.playback_start_time = Date.now();
            } else {
                this.metrics.playback.playback_start_time = performance.now();
            }

            this.metrics.playback.is_playing = true;
            this.metrics.playback.is_paused = false;
            this.metrics.playback.is_buffering = false;

            console.log('Playback timer resumed');
        } catch (error) {
            console.error('Error resuming playback timer:', error);
        }
    }

    /**
     * Handle buffering start - pause playback time accumulation
     */
    onBufferingStart() {
        try {
            if (this.metrics.playback.is_playing && !this.metrics.playback.is_buffering) {
                // Add current playback session to total before buffering
                if (this.metrics.playback.playback_start_time) {
                    let currentTime;
                    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                        currentTime = Date.now();
                    } else {
                        currentTime = performance.now();
                    }

                    const sessionDuration = (currentTime - this.metrics.playback.playback_start_time) / 1000;
                }

                this.metrics.playback.is_buffering = true;
                this.metrics.playback.playback_start_time = null;
                console.log('Buffering started - playback time paused');
            }
        } catch (error) {
            console.error('Error handling buffering start:', error);
        }
    }

    /**
     * Handle buffering end - resume playback time accumulation
     */
    onBufferingEnd() {
        try {
            if (this.metrics.playback.is_buffering && !this.metrics.playback.is_paused) {
                // Resume playback time tracking
                if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                    this.metrics.playback.playback_start_time = Date.now();
                } else {
                    this.metrics.playback.playback_start_time = performance.now();
                }

                this.metrics.playback.is_buffering = false;
                console.log('Buffering ended - playback time resumed');
            }
        } catch (error) {
            console.error('Error handling buffering end:', error);
        }
    }

    /**
     * Start real-time playback updates
     */
    startPlaybackUpdates() {
        try {
            // Clear any existing interval
            if (this.playbackUpdateInterval) {
                clearInterval(this.playbackUpdateInterval);
            }

            // Update every 500ms for smooth real-time display
            this.playbackUpdateInterval = setInterval(() => {
                this.updatePlaybackMetrics();
                this.updatePlaybackDisplay();
            }, 500);

            console.log('Real-time playback updates started');
        } catch (error) {
            console.error('Error starting playback updates:', error);
        }
    }

    /**
     * Stop real-time playback updates
     */
    stopPlaybackUpdates() {
        try {
            if (this.playbackUpdateInterval) {
                clearInterval(this.playbackUpdateInterval);
                this.playbackUpdateInterval = null;
                console.log('Real-time playback updates stopped');
            }
        } catch (error) {
            console.error('Error stopping playback updates:', error);
        }
    }

    /**
     * Update playback metrics calculations
     */
    updatePlaybackMetrics() {
        try {
            // Calculate current total playback time including active session
            let currentTotalPlaybackTime = 0;

            if (this.metrics.playback.is_playing &&
                !this.metrics.playback.is_buffering &&
                this.metrics.playback.playback_start_time) {

                let currentTime;
                if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                    currentTime = Date.now();
                } else {
                    currentTime = performance.now();
                }

                const activeSessionDuration = (currentTime - this.metrics.playback.playback_start_time) / 1000;
                currentTotalPlaybackTime += activeSessionDuration;
            }

            // Use rebuffering system's watch time instead of session duration
            // This properly excludes pauses and buffering
            this.metrics.playback.watch_time = this.metrics.rebuffering.total_watch_time;

            // For "Excludes Pauses & Buffering" measurement, Total Playback Time should equal Watch Time
            // This represents actual video playback time without interruptions
            currentTotalPlaybackTime = this.metrics.rebuffering.total_watch_time;

            // Calculate playback efficiency ratio (should be close to 100% with this logic)
            if (this.metrics.playback.watch_time > 0) {
                this.metrics.playback.playback_ratio = (currentTotalPlaybackTime / this.metrics.playback.watch_time) * 100;
            } else {
                this.metrics.playback.playback_ratio = 0;
            }

            // Store the calculated values for display
            this.displayPlaybackTime = currentTotalPlaybackTime;
        } catch (error) {
            console.error('Error updating playback metrics:', error);
        }
    }

    /**
     * Get current playback metrics
     */
    getPlaybackMetrics() {
        this.updatePlaybackMetrics();
        return { ...this.metrics.playback };
    }

    /**
     * Update playback metrics display
     */
    updatePlaybackDisplay() {
        try {
            // Find or create playback metrics panel
            let playbackPanel = document.getElementById('playbackMetricsPanel');

            if (!playbackPanel) {
                this.createPlaybackPanel();
                playbackPanel = document.getElementById('playbackMetricsPanel');
            }

            if (playbackPanel) {
                const totalPlaybackElement = playbackPanel.querySelector('#totalPlaybackValue');
                const watchTimeElement = playbackPanel.querySelector('#watchTimeValue');
                const playbackRatioElement = playbackPanel.querySelector('#playbackRatioValue');
                const playbackStatusElement = playbackPanel.querySelector('#playbackStatus');
                const efficiencyLevelElement = playbackPanel.querySelector('#efficiencyLevelValue');

                // Use display value if available, otherwise use stored value
                const displayTime = this.displayPlaybackTime || 0;

                if (totalPlaybackElement) {
                    totalPlaybackElement.textContent = displayTime.toFixed(2) + ' s';
                }

                if (watchTimeElement) {
                    watchTimeElement.textContent = this.formatWatchTime(this.metrics.playback.watch_time);
                }

                if (playbackRatioElement) {
                    playbackRatioElement.textContent = this.metrics.playback.playback_ratio.toFixed(2) + ' %';

                    // Add visual indicators based on efficiency
                    playbackRatioElement.className = 'info-item__value';
                    if (this.metrics.playback.playback_ratio >= 90) {
                        playbackRatioElement.classList.add('efficiency-excellent');
                        playbackRatioElement.title = 'Excellent playback efficiency - minimal interruptions';
                    } else if (this.metrics.playback.playback_ratio >= 75) {
                        playbackRatioElement.classList.add('efficiency-good');
                        playbackRatioElement.title = 'Good playback efficiency - some interruptions';
                    } else if (this.metrics.playback.playback_ratio >= 50) {
                        playbackRatioElement.classList.add('efficiency-fair');
                        playbackRatioElement.title = 'Fair playback efficiency - frequent interruptions';
                    } else {
                        playbackRatioElement.classList.add('efficiency-poor');
                        playbackRatioElement.title = 'Poor playback efficiency - many interruptions';
                    }
                }

                if (playbackStatusElement) {
                    let status = 'Ready';
                    let statusClass = 'info-item__value';

                    if (this.metrics.playback.is_buffering) {
                        status = 'Buffering';
                        statusClass += ' playback-buffering';
                    } else if (this.metrics.playback.is_playing) {
                        status = 'Playing';
                        statusClass += ' playback-active';
                    } else if (this.metrics.playback.is_paused) {
                        status = 'Paused';
                        statusClass += ' playback-paused';
                    }

                    playbackStatusElement.textContent = status;
                    playbackStatusElement.className = statusClass;
                }

                if (efficiencyLevelElement) {
                    let efficiencyLevel = 'Unknown';
                    let efficiencyClass = 'info-item__value';

                    if (this.metrics.playback.playback_ratio >= 90) {
                        efficiencyLevel = 'Excellent';
                        efficiencyClass += ' efficiency-excellent';
                    } else if (this.metrics.playback.playback_ratio >= 75) {
                        efficiencyLevel = 'Good';
                        efficiencyClass += ' efficiency-good';
                    } else if (this.metrics.playback.playback_ratio >= 50) {
                        efficiencyLevel = 'Fair';
                        efficiencyClass += ' efficiency-fair';
                    } else if (this.metrics.playback.watch_time > 0) {
                        efficiencyLevel = 'Poor';
                        efficiencyClass += ' efficiency-poor';
                    }

                    efficiencyLevelElement.textContent = efficiencyLevel;
                    efficiencyLevelElement.className = efficiencyClass;
                }
            }
        } catch (error) {
            console.error('Error updating playback display:', error);
        }
    }

    /**
     * Stop real-time playback updates
     */
    stopPlaybackUpdates() {
        try {
            if (this.playbackUpdateInterval) {
                clearInterval(this.playbackUpdateInterval);
                this.playbackUpdateInterval = null;
                console.log('Real-time playback updates stopped');
            }
        } catch (error) {
            console.error('Error stopping playback updates:', error);
        }
    }

    /**
     * Update playback metrics calculations
     */
    updatePlaybackMetrics() {
        try {
            // Calculate current total playback time including active session
            let currentPlaybackTime = 0;

            if (this.metrics.playback.is_playing &&
                !this.metrics.playback.is_buffering &&
                this.metrics.playback.playback_start_time) {

                let currentTime;
                if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                    currentTime = Date.now();
                } else {
                    currentTime = performance.now();
                }

                const activeSessionDuration = (currentTime - this.metrics.playback.playback_start_time) / 1000;
                currentPlaybackTime += activeSessionDuration;
            }

            // Calculate total watch time (session duration)
            if (this.metrics.playback.session_start_time) {
                let currentTime;
                if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                    currentTime = Date.now();
                } else {
                    currentTime = performance.now();
                }

                this.metrics.playback.watch_time = (currentTime - this.metrics.playback.session_start_time) / 1000;
            }

            // Calculate playback efficiency ratio
            if (this.metrics.playback.watch_time > 0) {
                this.metrics.playback.playback_ratio = (currentPlaybackTime / this.metrics.playback.watch_time) * 100;
            }

            // Update the stored total for display
            // total_playback_time removed - no longer used
        } catch (error) {
            console.error('Error updating playback metrics:', error);
        }
    }

    /**
     * Get current playback metrics
     */
    getPlaybackMetrics() {
        this.updatePlaybackMetrics();
        return { ...this.metrics.playback };
    }

    /**
     * Update playback metrics display
     */
    updatePlaybackDisplay() {
        try {
            // Find or create playback metrics panel
            let playbackPanel = document.getElementById('playbackMetricsPanel');

            if (!playbackPanel) {
                this.createPlaybackPanel();
                playbackPanel = document.getElementById('playbackMetricsPanel');
            }

            if (playbackPanel) {
                const totalPlaybackElement = playbackPanel.querySelector('#totalPlaybackValue');
                const watchTimeElement = playbackPanel.querySelector('#watchTimeValue');
                const playbackRatioElement = playbackPanel.querySelector('#playbackRatioValue');
                const playbackStatusElement = playbackPanel.querySelector('#playbackStatus');
                const efficiencyLevelElement = playbackPanel.querySelector('#efficiencyLevelValue');

                // Use display value if available, otherwise use stored value
                const displayTime = this.displayPlaybackTime || 0;

                if (totalPlaybackElement) {
                    totalPlaybackElement.textContent = displayTime.toFixed(2) + ' s';
                }

                if (watchTimeElement) {
                    watchTimeElement.textContent = this.formatWatchTime(this.metrics.playback.watch_time);
                }

                if (playbackRatioElement) {
                    playbackRatioElement.textContent = this.metrics.playback.playback_ratio.toFixed(2) + ' %';

                    // Add visual indicators based on efficiency
                    playbackRatioElement.className = 'info-item__value';
                    if (this.metrics.playback.playback_ratio >= 90) {
                        playbackRatioElement.classList.add('efficiency-excellent');
                        playbackRatioElement.title = 'Excellent playback efficiency - minimal interruptions';
                    } else if (this.metrics.playback.playback_ratio >= 75) {
                        playbackRatioElement.classList.add('efficiency-good');
                        playbackRatioElement.title = 'Good playback efficiency - some interruptions';
                    } else if (this.metrics.playback.playback_ratio >= 50) {
                        playbackRatioElement.classList.add('efficiency-fair');
                        playbackRatioElement.title = 'Fair playback efficiency - frequent interruptions';
                    } else {
                        playbackRatioElement.classList.add('efficiency-poor');
                        playbackRatioElement.title = 'Poor playback efficiency - many interruptions';
                    }
                }

                if (playbackStatusElement) {
                    let status = 'Ready';
                    let statusClass = 'info-item__value';

                    if (this.metrics.playback.is_buffering) {
                        status = 'Buffering';
                        statusClass += ' playback-buffering';
                    } else if (this.metrics.playback.is_playing) {
                        status = 'Playing';
                        statusClass += ' playback-active';
                    } else if (this.metrics.playback.is_paused) {
                        status = 'Paused';
                        statusClass += ' playback-paused';
                    }

                    playbackStatusElement.textContent = status;
                    playbackStatusElement.className = statusClass;
                }

                if (efficiencyLevelElement) {
                    let efficiencyLevel = 'Unknown';
                    let efficiencyClass = 'info-item__value';

                    if (this.metrics.playback.playback_ratio >= 90) {
                        efficiencyLevel = 'Excellent';
                        efficiencyClass += ' efficiency-excellent';
                    } else if (this.metrics.playback.playback_ratio >= 75) {
                        efficiencyLevel = 'Good';
                        efficiencyClass += ' efficiency-good';
                    } else if (this.metrics.playback.playback_ratio >= 50) {
                        efficiencyLevel = 'Fair';
                        efficiencyClass += ' efficiency-fair';
                    } else if (this.metrics.playback.watch_time > 0) {
                        efficiencyLevel = 'Poor';
                        efficiencyClass += ' efficiency-poor';
                    }

                    efficiencyLevelElement.textContent = efficiencyLevel;
                    efficiencyLevelElement.className = efficiencyClass;
                }
            }
        } catch (error) {
            console.error('Error updating playback display:', error);
        }
    }

    /**
     * Update frame statistics using video element statistics
     */
    updateFrameStats(droppedFrames = null, totalFrames = null) {
        try {
            const videoElement = this.metrics.frames.video_element;
            if (!videoElement) {
                console.warn('Video element not set for frame statistics');
                return;
            }

            // Use provided values or get from video element
            let currentDroppedFrames = droppedFrames;
            let currentTotalFrames = totalFrames;

            // Try to get frame statistics from video element
            if (currentDroppedFrames === null || currentTotalFrames === null) {
                // Check for webkitDroppedVideoFrames (Chrome/Safari)
                if (typeof videoElement.webkitDroppedVideoFrames !== 'undefined') {
                    currentDroppedFrames = videoElement.webkitDroppedVideoFrames;
                }

                // Check for webkitDecodedFrameCount (Chrome/Safari)
                if (typeof videoElement.webkitDecodedFrameCount !== 'undefined') {
                    currentTotalFrames = videoElement.webkitDecodedFrameCount;
                }

                // Fallback: try getVideoPlaybackQuality API
                if ((currentDroppedFrames === null || currentTotalFrames === null) &&
                    typeof videoElement.getVideoPlaybackQuality === 'function') {
                    const quality = videoElement.getVideoPlaybackQuality();
                    if (quality) {
                        currentDroppedFrames = quality.droppedVideoFrames || 0;
                        currentTotalFrames = quality.totalVideoFrames || 0;
                    }
                }
            }

            // Update metrics if we have valid data
            if (currentDroppedFrames !== null && currentTotalFrames !== null) {
                this.metrics.frames.dropped_frames = currentDroppedFrames;
                this.metrics.frames.total_frames = currentTotalFrames;

                // Calculate dropped frame ratio
                if (currentTotalFrames > 0) {
                    this.metrics.frames.dropped_frame_ratio =
                        (currentDroppedFrames / currentTotalFrames) * 100;
                } else {
                    this.metrics.frames.dropped_frame_ratio = 0;
                }

                this.metrics.frames.last_update = Date.now();
                this.updateFrameDisplay();

                console.log('Frame stats updated:', {
                    dropped: currentDroppedFrames,
                    total: currentTotalFrames,
                    ratio: this.metrics.frames.dropped_frame_ratio.toFixed(2) + '%'
                });
            } else {
                console.warn('Unable to get frame statistics from video element');
            }
        } catch (error) {
            console.error('Error updating frame stats:', error);
        }
    }

    /**
     * Get current frame metrics
     */
    getFrameMetrics() {
        return { ...this.metrics.frames };
    }

    /**
     * Start frame statistics monitoring
     */
    startFrameStatsMonitoring() {
        try {
            // Clear any existing interval
            if (this.frameStatsInterval) {
                clearInterval(this.frameStatsInterval);
            }

            // Update frame stats every 1 second
            this.frameStatsInterval = setInterval(() => {
                this.updateFrameStats();
            }, 1000);

            console.log('Frame statistics monitoring started');
        } catch (error) {
            console.error('Error starting frame stats monitoring:', error);
        }
    }

    /**
     * Stop frame statistics monitoring
     */
    stopFrameStatsMonitoring() {
        try {
            if (this.frameStatsInterval) {
                clearInterval(this.frameStatsInterval);
                this.frameStatsInterval = null;
                console.log('Frame statistics monitoring stopped');
            }
        } catch (error) {
            console.error('Error stopping frame stats monitoring:', error);
        }
    }

    /**
     * Update FPS measurement using requestAnimationFrame
     */
    updateFPS(currentFPS = null) {
        try {
            let fps = currentFPS;

            // If no FPS provided, calculate it using requestAnimationFrame
            if (fps === null) {
                const now = performance.now();

                if (this.metrics.fps.last_frame_time === null) {
                    this.metrics.fps.last_frame_time = now;
                    return; // Skip first frame để có baseline
                }

                const deltaTime = now - this.metrics.fps.last_frame_time;
                if (deltaTime > 0) {
                    fps = 1000 / deltaTime; // Convert to FPS
                }

                this.metrics.fps.last_frame_time = now;
                this.metrics.fps.frame_count++;
            }

            if (fps !== null && fps > 0) {
                this.metrics.fps.current_fps = fps;

                // Update min/max FPS
                if (this.metrics.fps.min_fps === null || fps < this.metrics.fps.min_fps) {
                    this.metrics.fps.min_fps = fps;
                }
                if (fps > this.metrics.fps.max_fps) {
                    this.metrics.fps.max_fps = fps;
                }

                // Add to samples for average calculation (keep last 60 samples)
                this.metrics.fps.fps_samples.push(fps);
                if (this.metrics.fps.fps_samples.length > 60) {
                    this.metrics.fps.fps_samples.shift();
                }

                // Calculate average FPS
                if (this.metrics.fps.fps_samples.length > 0) {
                    const sum = this.metrics.fps.fps_samples.reduce((a, b) => a + b, 0);
                    this.metrics.fps.avg_fps = sum / this.metrics.fps.fps_samples.length;
                }

                // Chỉ update display mỗi 500ms để tránh spam
                const now = performance.now();
                if (!this.metrics.fps.last_display_update ||
                    now - this.metrics.fps.last_display_update > 500) {
                    this.updateFPSDisplay();
                    this.metrics.fps.last_display_update = now;
                }
            }
        } catch (error) {
            console.error('Error updating FPS:', error);
        }
    }

    /**
     * Get current FPS metrics
     */
    getFPSMetrics() {
        return { ...this.metrics.fps };
    }

    /**
     * Start FPS monitoring using optimized interval approach
     */
    startFPSMonitoring() {
        try {
            // Stop existing monitoring
            this.stopFPSMonitoring();

            this.metrics.fps.measurement_start_time = performance.now();
            this.metrics.fps.last_frame_time = null;
            this.metrics.fps.frame_count = 0;
            this.metrics.fps.last_display_update = null;

            // Sử dụng approach tối ưu hơn: đo FPS mỗi 100ms thay vì mỗi frame
            let frameCount = 0;
            let lastTime = performance.now();

            const measureFPS = () => {
                const now = performance.now();
                frameCount++;

                // Tính FPS mỗi 100ms
                const elapsed = now - lastTime;
                if (elapsed >= 100) { // 100ms interval
                    const fps = (frameCount * 1000) / elapsed;
                    this.updateFPS(fps);

                    frameCount = 0;
                    lastTime = now;
                }

                this.fpsAnimationFrame = requestAnimationFrame(measureFPS);
            };

            this.fpsAnimationFrame = requestAnimationFrame(measureFPS);
            console.log('Optimized FPS monitoring started');
        } catch (error) {
            console.error('Error starting FPS monitoring:', error);
        }
    }

    /**
     * Stop FPS monitoring
     */
    stopFPSMonitoring() {
        try {
            if (this.fpsAnimationFrame) {
                cancelAnimationFrame(this.fpsAnimationFrame);
                this.fpsAnimationFrame = null;
            }

            if (this.fpsVideoInterval) {
                clearInterval(this.fpsVideoInterval);
                this.fpsVideoInterval = null;
            }

            console.log('FPS monitoring stopped');
        } catch (error) {
            console.error('Error stopping FPS monitoring:', error);
        }
    }

    /**
     * Alternative FPS measurement using video element statistics
     */
    measureVideoFPS() {
        try {
            if (!this.videoElement) {
                console.warn('No video element available for FPS measurement');
                return;
            }

            // Try to get video frame statistics
            let fps = null;

            // Method 1: Use getVideoPlaybackQuality API (Chrome/Firefox)
            if (typeof this.videoElement.getVideoPlaybackQuality === 'function') {
                const quality = this.videoElement.getVideoPlaybackQuality();
                if (quality && quality.totalVideoFrames !== undefined) {
                    const now = performance.now();

                    if (this.metrics.fps.last_quality_check) {
                        const timeDiff = (now - this.metrics.fps.last_quality_check) / 1000; // seconds
                        const frameDiff = quality.totalVideoFrames - (this.metrics.fps.last_total_frames || 0);

                        if (timeDiff > 0 && frameDiff > 0) {
                            fps = frameDiff / timeDiff;
                        }
                    }

                    this.metrics.fps.last_quality_check = now;
                    this.metrics.fps.last_total_frames = quality.totalVideoFrames;
                }
            }

            // Method 2: Use webkitDecodedFrameCount (Safari/Chrome)
            if (fps === null && typeof this.videoElement.webkitDecodedFrameCount !== 'undefined') {
                const now = performance.now();
                const currentFrames = this.videoElement.webkitDecodedFrameCount;

                if (this.metrics.fps.last_webkit_check) {
                    const timeDiff = (now - this.metrics.fps.last_webkit_check) / 1000;
                    const frameDiff = currentFrames - (this.metrics.fps.last_webkit_frames || 0);

                    if (timeDiff > 0 && frameDiff > 0) {
                        fps = frameDiff / timeDiff;
                    }
                }

                this.metrics.fps.last_webkit_check = now;
                this.metrics.fps.last_webkit_frames = currentFrames;
            }

            // Update FPS if we got a valid measurement
            if (fps !== null && fps > 0 && fps <= 120) { // Reasonable FPS range
                this.updateFPS(fps);
                console.log(`Video FPS measured: ${fps.toFixed(1)}`);
            }

        } catch (error) {
            console.error('Error measuring video FPS:', error);
        }
    }

    /**
     * Start hybrid FPS monitoring (combines requestAnimationFrame + video stats)
     */
    startHybridFPSMonitoring() {
        try {
            this.stopFPSMonitoring();

            // Reset metrics
            this.metrics.fps.measurement_start_time = performance.now();
            this.metrics.fps.last_frame_time = null;
            this.metrics.fps.frame_count = 0;
            this.metrics.fps.last_display_update = null;
            this.metrics.fps.last_quality_check = null;
            this.metrics.fps.last_webkit_check = null;

            // Primary method: requestAnimationFrame (optimized)
            let frameCount = 0;
            let lastTime = performance.now();

            const measureFPS = () => {
                const now = performance.now();
                frameCount++;

                const elapsed = now - lastTime;
                if (elapsed >= 200) { // Measure every 200ms
                    const fps = (frameCount * 1000) / elapsed;
                    this.updateFPS(fps);

                    frameCount = 0;
                    lastTime = now;
                }

                this.fpsAnimationFrame = requestAnimationFrame(measureFPS);
            };

            // Secondary method: Video element stats (every 1 second)
            this.fpsVideoInterval = setInterval(() => {
                this.measureVideoFPS();
            }, 1000);

            this.fpsAnimationFrame = requestAnimationFrame(measureFPS);
            console.log('Hybrid FPS monitoring started');
        } catch (error) {
            console.error('Error starting hybrid FPS monitoring:', error);
        }
    }

    /**
     * Update frame metrics display
     */
    updateFrameDisplay() {
        try {
            // Find or create frame metrics panel
            let framePanel = document.getElementById('frameMetricsPanel');

            if (!framePanel) {
                this.createFramePanel();
                framePanel = document.getElementById('frameMetricsPanel');
            }

            if (framePanel) {
                const droppedFramesElement = framePanel.querySelector('#droppedFramesValue');
                const totalFramesElement = framePanel.querySelector('#totalFramesValue');
                const frameRatioElement = framePanel.querySelector('#frameRatioValue');
                const frameStatusElement = framePanel.querySelector('#frameStatus');

                if (droppedFramesElement) {
                    droppedFramesElement.textContent = this.metrics.frames.dropped_frames.toLocaleString();
                }

                if (totalFramesElement) {
                    totalFramesElement.textContent = this.metrics.frames.total_frames.toLocaleString();
                }

                if (frameRatioElement) {
                    const ratio = this.metrics.frames.dropped_frame_ratio;
                    frameRatioElement.textContent = ratio.toFixed(3) + ' %';

                    // Add visual indicators based on ratio
                    frameRatioElement.className = 'info-item__value';
                    if (ratio > 5) {
                        frameRatioElement.classList.add('frame-drop-high');
                        frameRatioElement.title = 'High frame drop ratio - poor video quality';
                    } else if (ratio > 1) {
                        frameRatioElement.classList.add('frame-drop-medium');
                        frameRatioElement.title = 'Medium frame drop ratio - acceptable quality';
                    } else if (ratio > 0) {
                        frameRatioElement.classList.add('frame-drop-low');
                        frameRatioElement.title = 'Low frame drop ratio - good quality';
                    } else {
                        frameRatioElement.classList.add('frame-drop-excellent');
                        frameRatioElement.title = 'No frames dropped - excellent quality';
                    }
                }

                if (frameStatusElement) {
                    if (this.metrics.frames.total_frames > 0) {
                        frameStatusElement.textContent = 'Monitoring';
                        frameStatusElement.className = 'info-item__value';
                    } else {
                        frameStatusElement.textContent = 'No Data';
                        frameStatusElement.className = 'info-item__value';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating frame display:', error);
        }
    }

    /**
     * Update FPS metrics display
     */
    updateFPSDisplay() {
        try {
            // Find or create frame metrics panel (FPS is part of frame panel)
            let framePanel = document.getElementById('frameMetricsPanel');

            if (!framePanel) {
                this.createFramePanel();
                framePanel = document.getElementById('frameMetricsPanel');
            }

            if (framePanel) {
                const currentFPSElement = framePanel.querySelector('#currentFPSValue');
                const minFPSElement = framePanel.querySelector('#minFPSValue');
                const maxFPSElement = framePanel.querySelector('#maxFPSValue');
                const avgFPSElement = framePanel.querySelector('#avgFPSValue');

                if (currentFPSElement) {
                    currentFPSElement.textContent = this.metrics.fps.current_fps.toFixed(1);
                }

                if (minFPSElement) {
                    const minFPS = this.metrics.fps.min_fps;
                    minFPSElement.textContent = minFPS !== null ? minFPS.toFixed(1) : '-';
                }

                if (maxFPSElement) {
                    maxFPSElement.textContent = this.metrics.fps.max_fps.toFixed(1);
                }

                if (avgFPSElement) {
                    avgFPSElement.textContent = this.metrics.fps.avg_fps.toFixed(1);
                }
            }
        } catch (error) {
            console.error('Error updating FPS display:', error);
        }
    }

    /**
     * Create frame metrics panel in dashboard
     */
    createFramePanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) {
                console.warn('Dashboard grid not found, cannot create frame panel');
                return;
            }

            const framePanel = document.createElement('article');
            framePanel.className = 'card';
            framePanel.id = 'frameMetricsPanel';

            framePanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-film"></i>
                        Frame Performance
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Dropped Frames:</span>
                            <span class="info-item__value" id="droppedFramesValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Total Frames:</span>
                            <span class="info-item__value" id="totalFramesValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Drop Ratio:</span>
                            <span class="info-item__value frame-drop-excellent" id="frameRatioValue">0.000 %</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Current FPS:</span>
                            <span class="info-item__value" id="currentFPSValue">0.0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Min FPS:</span>
                            <span class="info-item__value" id="minFPSValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Max FPS:</span>
                            <span class="info-item__value" id="maxFPSValue">0.0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Avg FPS:</span>
                            <span class="info-item__value" id="avgFPSValue">0.0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Status:</span>
                            <span class="info-item__value" id="frameStatus">Ready</span>
                        </div>
                    </div>
                </div>
            `;

            // Insert after playback panel if it exists, or after rebuffer panel
            const playbackPanel = document.getElementById('playbackMetricsPanel');
            const rebufferPanel = document.getElementById('rebufferMetricsPanel');
            const startupPanel = document.getElementById('startupMetricsPanel');

            // Insert after Data Consumption card (position 6)
            const dataCard = document.getElementById('dataConsumptionPanel');
            if (dataCard && dataCard.nextSibling) {
                dashboardGrid.insertBefore(framePanel, dataCard.nextSibling);
            } else if (dataCard) {
                dashboardGrid.insertBefore(framePanel, dataCard.nextSibling);
            } else {
                dashboardGrid.appendChild(framePanel);
            }

            console.log('Frame metrics panel created');
        } catch (error) {
            console.error('Error creating frame panel:', error);
        }
    }

    /**
     * Reset frame metrics for new session
     */
    resetFrameMetrics() {
        try {
            // Stop monitoring
            this.stopFrameStatsMonitoring();
            this.stopFPSMonitoring();

            this.metrics.frames = {
                dropped_frames: 0,
                total_frames: 0,
                dropped_frame_ratio: 0,
                last_update: null,
                video_element: this.metrics.frames.video_element // Keep video element reference
            };

            this.metrics.fps = {
                current_fps: 0,
                min_fps: null,
                max_fps: 0,
                avg_fps: 0,
                fps_samples: [],
                last_frame_time: null,
                frame_count: 0,
                measurement_start_time: null,
                last_display_update: null
            };

            this.updateFrameDisplay();
            this.updateFPSDisplay();
            console.log('Frame metrics reset');
        } catch (error) {
            console.error('Error resetting frame metrics:', error);
        }
    }

    /**
     * Track segment duration when a segment is loaded
     */
    onSegmentLoaded(segmentDuration, segmentLoadTime) {
        try {
            console.log('onSegmentLoaded called with:', { segmentDuration, segmentLoadTime });
            if (typeof segmentDuration !== 'number' || segmentDuration <= 0) {
                console.warn('Invalid segment duration:', segmentDuration);
                return;
            }

            // Track segment duration
            this.metrics.segments.segment_durations.push(segmentDuration);
            this.metrics.segments.total_segment_duration += segmentDuration;
            this.metrics.segments.segment_count++;

            // Update min/max segment duration
            if (this.metrics.segments.min_segment_duration === null || segmentDuration < this.metrics.segments.min_segment_duration) {
                this.metrics.segments.min_segment_duration = segmentDuration;
            }
            if (segmentDuration > this.metrics.segments.max_segment_duration) {
                this.metrics.segments.max_segment_duration = segmentDuration;
            }

            // Calculate average segment duration
            this.metrics.segments.avg_segment_duration = this.metrics.segments.total_segment_duration / this.metrics.segments.segment_count;

            // Track segment load time if provided
            if (typeof segmentLoadTime === 'number' && segmentLoadTime > 0) {
                this.onSegmentLoadTime(segmentLoadTime);
            }

            this.metrics.segments.last_segment_time = Date.now();
            this.updateSegmentDisplay();

            // Start real-time updates if not already running
            this.startSegmentRealTimeUpdates();

            console.log('Segment loaded - Duration:', segmentDuration.toFixed(3) + 's',
                'Load time:', segmentLoadTime ? segmentLoadTime.toFixed(2) + 'ms' : 'N/A');
        } catch (error) {
            console.error('Error tracking segment duration:', error);
        }
    }

    /**
     * Track segment load time
     */
    onSegmentLoadTime(loadTime) {
        try {
            if (typeof loadTime !== 'number' || loadTime <= 0) {
                console.warn('Invalid segment load time:', loadTime);
                return;
            }

            this.metrics.segments.segment_load_times.push(loadTime);
            this.metrics.segments.total_segment_load_time += loadTime;
            this.metrics.segments.total_segment_loaded++;

            // Update min/max segment load time
            if (this.metrics.segments.min_segment_loadtime === null || loadTime < this.metrics.segments.min_segment_loadtime) {
                this.metrics.segments.min_segment_loadtime = loadTime;
            }
            if (loadTime > this.metrics.segments.max_segment_loadtime) {
                this.metrics.segments.max_segment_loadtime = loadTime;
            }

            // Calculate average segment load time
            this.metrics.segments.avg_segment_load_time = this.metrics.segments.total_segment_load_time / this.metrics.segments.total_segment_loaded;

            this.updateSegmentDisplay();
        } catch (error) {
            console.error('Error tracking segment load time:', error);
        }
    }

    /**
     * Get segment metrics
     */
    getSegmentMetrics() {
        return { ...this.metrics.segments };
    }

    /**
     * Update segment display panel
     */
    updateSegmentDisplay() {
        try {
            let segmentPanel = document.getElementById('segmentMetricsPanel');

            if (!segmentPanel) {
                this.createSegmentPanel();
                segmentPanel = document.getElementById('segmentMetricsPanel');
            }

            if (segmentPanel) {
                const maxDurationElement = segmentPanel.querySelector('#maxSegmentDurationValue');
                const minDurationElement = segmentPanel.querySelector('#minSegmentDurationValue');
                const avgDurationElement = segmentPanel.querySelector('#avgSegmentDurationValue');
                const avgLoadTimeElement = segmentPanel.querySelector('#avgSegmentLoadTimeValue');
                const minLoadTimeElement = segmentPanel.querySelector('#minSegmentLoadTimeValue');
                const maxLoadTimeElement = segmentPanel.querySelector('#maxSegmentLoadTimeValue');
                const totalLoadedElement = segmentPanel.querySelector('#totalSegmentLoadedValue');
                const segmentCountElement = segmentPanel.querySelector('#segmentCountValue');

                if (maxDurationElement) {
                    maxDurationElement.textContent = this.metrics.segments.max_segment_duration.toFixed(3) + ' s';
                }

                if (minDurationElement) {
                    const minDuration = this.metrics.segments.min_segment_duration;
                    minDurationElement.textContent = minDuration !== null ? minDuration.toFixed(3) + ' s' : '-';
                }

                if (avgDurationElement) {
                    avgDurationElement.textContent = this.metrics.segments.avg_segment_duration.toFixed(3) + ' s';
                }

                if (avgLoadTimeElement) {
                    avgLoadTimeElement.textContent = this.metrics.segments.avg_segment_load_time.toFixed(2) + ' ms';
                }

                if (minLoadTimeElement) {
                    const minLoadTime = this.metrics.segments.min_segment_loadtime;
                    minLoadTimeElement.textContent = minLoadTime !== null ? minLoadTime.toFixed(2) + ' ms' : '-';
                }

                if (maxLoadTimeElement) {
                    maxLoadTimeElement.textContent = this.metrics.segments.max_segment_loadtime.toFixed(2) + ' ms';
                }

                if (totalLoadedElement) {
                    totalLoadedElement.textContent = this.metrics.segments.total_segment_loaded.toString();
                }

                if (segmentCountElement) {
                    segmentCountElement.textContent = this.metrics.segments.segment_count.toString();
                }
            }
        } catch (error) {
            console.error('Error updating segment display:', error);
        }
    }

    /**
     * Create segment metrics panel in dashboard
     */
    createSegmentPanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) {
                console.warn('Dashboard grid not found, cannot create segment panel');
                return;
            }

            const segmentPanel = document.createElement('article');
            segmentPanel.className = 'card';
            segmentPanel.id = 'segmentMetricsPanel';

            segmentPanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-puzzle-piece"></i>
                        Segment Performance
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Max Duration:</span>
                            <span class="info-item__value" id="maxSegmentDurationValue">0.000 s</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Min Duration:</span>
                            <span class="info-item__value" id="minSegmentDurationValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Avg Duration:</span>
                            <span class="info-item__value" id="avgSegmentDurationValue">0.000 s</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Segment Count:</span>
                            <span class="info-item__value" id="segmentCountValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Avg Load Time:</span>
                            <span class="info-item__value" id="avgSegmentLoadTimeValue">0.00 ms</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Min Load Time:</span>
                            <span class="info-item__value" id="minSegmentLoadTimeValue">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Max Load Time:</span>
                            <span class="info-item__value" id="maxSegmentLoadTimeValue">0.00 ms</span>
                        </div>
                    </div>
                </div>
            `;

            // Insert after frame panel if it exists, otherwise at the end
            // Insert after Frame Performance card (position 7)
            const framePanel = document.getElementById('frameMetricsPanel');
            if (framePanel && framePanel.nextSibling) {
                dashboardGrid.insertBefore(segmentPanel, framePanel.nextSibling);
            } else if (framePanel) {
                dashboardGrid.insertBefore(segmentPanel, framePanel.nextSibling);
            } else {
                dashboardGrid.appendChild(segmentPanel);
            }

        } catch (error) {
            console.error('Error creating segment panel:', error);
        }
    }

    /**
     * Start real-time segment updates
     */
    startSegmentRealTimeUpdates() {
        try {
            // Don't start if already running
            if (this.segmentUpdateInterval) {
                return;
            }

            // Update segment display every 1 second for real-time feel
            this.segmentUpdateInterval = setInterval(() => {
                this.updateSegmentDisplay();
            }, 1000);

        } catch (error) {
            console.error('Error starting segment real-time updates:', error);
        }
    }

    /**
     * Stop real-time segment updates
     */
    stopSegmentRealTimeUpdates() {
        try {
            if (this.segmentUpdateInterval) {
                clearInterval(this.segmentUpdateInterval);
                this.segmentUpdateInterval = null;
            }
        } catch (error) {
            console.error('Error stopping segment real-time updates:', error);
        }
    }

    /**
     * Reset segment metrics for new session
     */
    resetSegmentMetrics() {
        try {
            // Stop real-time updates
            this.stopSegmentRealTimeUpdates();

            this.metrics.segments = {
                max_segment_duration: 0,
                min_segment_duration: null,
                avg_segment_duration: 0,
                total_segment_duration: 0,
                segment_count: 0,
                avg_segment_load_time: 0,
                min_segment_loadtime: null,
                max_segment_loadtime: 0,
                total_segment_load_time: 0,
                total_segment_loaded: 0,
                segment_durations: [],
                segment_load_times: [],
                last_segment_time: null
            };
            this.updateSegmentDisplay();
            console.log('Segment metrics reset');
        } catch (error) {
            console.error('Error resetting segment metrics:', error);
        }
    }

    /**
     * Public method để set video element và enable event-based rebuffer detection
     */
    attachVideoElement(videoElement) {
        if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
            console.error('Invalid video element provided to PerformanceTracker');
            return;
        }

        console.log('Attaching video element for event-based rebuffer detection');
        this.setVideoElement(videoElement);
    }

    /**
     * Manually trigger playing event - for compatibility with existing event handlers
     */
    triggerPlayingEvent() {
        console.log('Manually triggering playing event');
        this.onVideoPlaying({ type: 'playing', target: this.videoElement });
    }

    /**
     * Force update rebuffer display - for debugging
     */
    forceUpdateDisplay() {
        console.log('Force updating rebuffer display', {
            isFirstPlaying: this.metrics.rebuffering.is_first_playing,
            isWaitingForBuffer: this.isWaitingForBuffer
        });
        this.updateRebufferDisplay();
    }

    /**
     * Get current rebuffer detection configuration
     */
    getRebufferConfig() {
        return {
            minRebufferDuration: this.metrics.rebuffering.min_rebuffer_duration,
            detectionMode: 'event-based',
            isFirstPlaying: this.metrics.rebuffering.is_first_playing,
            isWaitingForBuffer: this.isWaitingForBuffer,
            hasVideoElement: !!this.videoElement
        };
    }

    /**
     * Update rebuffer detection configuration
     */
    updateRebufferConfig(config) {
        if (config.minRebufferDuration && typeof config.minRebufferDuration === 'number') {
            this.metrics.rebuffering.min_rebuffer_duration = config.minRebufferDuration;
            console.log(`Updated min rebuffer duration to ${config.minRebufferDuration}ms`);
        }
    }
}
