/**
 * PerformanceTracker - Đo lường hiệu suất startup và các metrics khác (Clean version)
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
                is_first_playing: true,
                last_timeupdate_time: null,
                last_current_time: 0,
                min_rebuffer_duration: 250,
                watch_time_accumulated: 0,
                last_watch_time_checkpoint: null
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
                measurement_start_time: null
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
            }
        };

        this.isStartupMeasurementActive = false;
        this.isRebufferingActive = false;
        this.realTimeUpdateInterval = null;
        this.frameStatsInterval = null;
        this.fpsAnimationFrame = null;
        this.segmentUpdateInterval = null;

        this.videoElement = null;
        this.isWaitingForBuffer = false;
        this.rebufferStartTime = null;
        this.boundEventHandlers = null;

        console.log('PerformanceTracker initialized (clean version)');
    }

    /**
     * Set video element để track events
     */
    setVideoElement(videoElement) {
        this.videoElement = videoElement;
        this.setupVideoEventListeners();
    }

    /**
     * Setup event listeners cho rebuffering detection
     */
    setupVideoEventListeners() {
        if (!this.videoElement) return;

        this.removeVideoEventListeners();
        console.log('Setting up PerformanceTracker video event listeners');

        this.boundEventHandlers = {
            waiting: this.onVideoWaiting.bind(this),
            playing: this.onVideoPlaying.bind(this),
            canplay: this.onVideoCanPlay.bind(this),
            pause: this.onVideoPause.bind(this),
            timeupdate: this.onVideoTimeUpdate.bind(this)
        };

        Object.entries(this.boundEventHandlers).forEach(([event, handler]) => {
            this.videoElement.addEventListener(event, handler);
        });
    }

    /**
     * Remove video event listeners
     */
    removeVideoEventListeners() {
        if (!this.videoElement || !this.boundEventHandlers) return;

        Object.entries(this.boundEventHandlers).forEach(([event, handler]) => {
            this.videoElement.removeEventListener(event, handler);
        });
        this.boundEventHandlers = null;
    }

    /**
     * Video event handlers
     */
    onVideoWaiting(event) {
        this.startRebufferMeasurement();
    }

    onVideoPlaying(event) {
        this.endRebufferMeasurement();
        this.triggerPlayingEvent();
    }

    onVideoCanPlay(event) {
        this.endRebufferMeasurement();
    }

    onVideoPause(event) {
        this.checkpointWatchTime();
    }

    onVideoTimeUpdate(event) {
        this.updateWatchTime();
    }

    /**
     * Startup measurement methods
     */
    startStartupMeasurement() {
        try {
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                this.metrics.startup.play_start_time = Date.now();
            } else {
                this.metrics.startup.play_start_time = performance.now();
            }
            this.isStartupMeasurementActive = true;
            console.log('Startup measurement started');
        } catch (error) {
            console.error('Error starting startup measurement:', error);
        }
    }

    recordFirstFrame() {
        try {
            if (!this.isStartupMeasurementActive) return;

            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            this.metrics.startup.first_frame_time = currentTime;
            this.metrics.startup.timestamp = new Date().toISOString();

            if (this.metrics.startup.play_start_time) {
                this.metrics.startup.startup_time =
                    (currentTime - this.metrics.startup.play_start_time) / 1000;
            }

            this.isStartupMeasurementActive = false;
            this.updateStartupDisplay();
            console.log('Startup time recorded:', this.metrics.startup.startup_time?.toFixed(2) + 's');
        } catch (error) {
            console.error('Error recording first frame:', error);
        }
    }

    /**
     * Rebuffering methods
     */
    startRebufferMeasurement() {
        try {
            if (this.isRebufferingActive) return;

            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            this.metrics.rebuffering.current_rebuffer_start = currentTime;
            this.isRebufferingActive = true;
            console.log('Rebuffer measurement started');
        } catch (error) {
            console.error('Error starting rebuffer measurement:', error);
        }
    }

    endRebufferMeasurement() {
        try {
            if (!this.isRebufferingActive || !this.metrics.rebuffering.current_rebuffer_start) return;

            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            const rebufferDuration = currentTime - this.metrics.rebuffering.current_rebuffer_start;

            if (rebufferDuration >= this.metrics.rebuffering.min_rebuffer_duration) {
                this.metrics.rebuffering.rebuffer_count++;
                this.metrics.rebuffering.rebuffer_duration += rebufferDuration / 1000;
                this.metrics.rebuffering.last_rebuffer_time = new Date().toISOString();

                this.calculateRebufferRatio();
                this.updateRebufferDisplay();

                console.log('Rebuffer recorded:', (rebufferDuration / 1000).toFixed(2) + 's');
            }

            this.metrics.rebuffering.current_rebuffer_start = null;
            this.isRebufferingActive = false;
        } catch (error) {
            console.error('Error ending rebuffer measurement:', error);
        }
    }

    /**
     * Watch time tracking
     */
    startWatchTime() {
        try {
            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            this.metrics.rebuffering.watch_time_start = currentTime;
            console.log('Watch time tracking started');
        } catch (error) {
            console.error('Error starting watch time:', error);
        }
    }

    updateWatchTime() {
        try {
            if (!this.metrics.rebuffering.watch_time_start) return;

            let currentTime;
            if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
                currentTime = Date.now();
            } else {
                currentTime = performance.now();
            }

            this.metrics.rebuffering.total_watch_time =
                (currentTime - this.metrics.rebuffering.watch_time_start) / 1000;

            this.calculateRebufferRatio();
        } catch (error) {
            console.error('Error updating watch time:', error);
        }
    }

    checkpointWatchTime() {
        try {
            this.updateWatchTime();
            this.metrics.rebuffering.watch_time_accumulated = this.metrics.rebuffering.total_watch_time;
            this.metrics.rebuffering.last_watch_time_checkpoint = Date.now();
        } catch (error) {
            console.error('Error checkpointing watch time:', error);
        }
    }

    calculateRebufferRatio() {
        try {
            if (this.metrics.rebuffering.total_watch_time > 0) {
                this.metrics.rebuffering.rebuffer_ratio =
                    (this.metrics.rebuffering.rebuffer_duration / this.metrics.rebuffering.total_watch_time) * 100;
            } else {
                this.metrics.rebuffering.rebuffer_ratio = 0;
            }
        } catch (error) {
            console.error('Error calculating rebuffer ratio:', error);
        }
    }

    /**
     * Frame statistics
     */
    attachVideoElement(videoElement) {
        this.setVideoElement(videoElement);
        this.metrics.frames.video_element = videoElement;
    }

    startFrameStatsMonitoring() {
        try {
            if (this.frameStatsInterval) {
                clearInterval(this.frameStatsInterval);
            }

            this.frameStatsInterval = setInterval(() => {
                this.updateFrameStats();
            }, 2000);

            console.log('Frame statistics monitoring started');
        } catch (error) {
            console.error('Error starting frame stats monitoring:', error);
        }
    }

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

    updateFrameStats() {
        try {
            const videoElement = this.metrics.frames.video_element;
            if (!videoElement) return;

            let currentDroppedFrames = 0;
            let currentTotalFrames = 0;

            if (typeof videoElement.webkitDroppedVideoFrames !== 'undefined') {
                currentDroppedFrames = videoElement.webkitDroppedVideoFrames;
            }

            if (typeof videoElement.webkitDecodedFrameCount !== 'undefined') {
                currentTotalFrames = videoElement.webkitDecodedFrameCount;
            }

            if (typeof videoElement.getVideoPlaybackQuality === 'function') {
                const quality = videoElement.getVideoPlaybackQuality();
                if (quality) {
                    currentDroppedFrames = quality.droppedVideoFrames || 0;
                    currentTotalFrames = quality.totalVideoFrames || 0;
                }
            }

            this.metrics.frames.dropped_frames = currentDroppedFrames;
            this.metrics.frames.total_frames = currentTotalFrames;

            if (currentTotalFrames > 0) {
                this.metrics.frames.dropped_frame_ratio =
                    (currentDroppedFrames / currentTotalFrames) * 100;
            }

            this.metrics.frames.last_update = Date.now();
            this.updateFrameDisplay();
        } catch (error) {
            console.error('Error updating frame stats:', error);
        }
    }

    /**
     * FPS monitoring
     */
    startFPSMonitoring() {
        try {
            this.metrics.fps.measurement_start_time = performance.now();
            this.metrics.fps.frame_count = 0;
            this.measureFPS();
            console.log('FPS monitoring started');
        } catch (error) {
            console.error('Error starting FPS monitoring:', error);
        }
    }

    stopFPSMonitoring() {
        try {
            if (this.fpsAnimationFrame) {
                cancelAnimationFrame(this.fpsAnimationFrame);
                this.fpsAnimationFrame = null;
                console.log('FPS monitoring stopped');
            }
        } catch (error) {
            console.error('Error stopping FPS monitoring:', error);
        }
    }

    measureFPS() {
        try {
            const currentTime = performance.now();
            this.metrics.fps.frame_count++;

            if (this.metrics.fps.last_frame_time) {
                const frameDelta = currentTime - this.metrics.fps.last_frame_time;
                const instantFPS = 1000 / frameDelta;

                this.metrics.fps.fps_samples.push(instantFPS);
                if (this.metrics.fps.fps_samples.length > 60) {
                    this.metrics.fps.fps_samples.shift();
                }

                this.metrics.fps.current_fps =
                    this.metrics.fps.fps_samples.reduce((a, b) => a + b, 0) /
                    this.metrics.fps.fps_samples.length;

                if (this.metrics.fps.min_fps === null || instantFPS < this.metrics.fps.min_fps) {
                    this.metrics.fps.min_fps = instantFPS;
                }
                if (instantFPS > this.metrics.fps.max_fps) {
                    this.metrics.fps.max_fps = instantFPS;
                }
            }

            this.metrics.fps.last_frame_time = currentTime;
            this.fpsAnimationFrame = requestAnimationFrame(() => this.measureFPS());
        } catch (error) {
            console.error('Error measuring FPS:', error);
        }
    }

    /**
     * Display update methods
     */
    updateStartupDisplay() {
        try {
            const startupPanel = document.getElementById('startupMetricsPanel');
            if (!startupPanel) return;

            const startupTimeElement = startupPanel.querySelector('#startupTimeValue');
            if (startupTimeElement && this.metrics.startup.startup_time !== null) {
                startupTimeElement.textContent = this.metrics.startup.startup_time.toFixed(2) + ' s';
            }
        } catch (error) {
            console.error('Error updating startup display:', error);
        }
    }

    updateRebufferDisplay() {
        try {
            const rebufferPanel = document.getElementById('rebufferMetricsPanel');
            if (!rebufferPanel) return;

            const rebufferCountElement = rebufferPanel.querySelector('#rebufferCountValue');
            const rebufferDurationElement = rebufferPanel.querySelector('#rebufferDurationValue');
            const rebufferRatioElement = rebufferPanel.querySelector('#rebufferRatioValue');

            if (rebufferCountElement) {
                rebufferCountElement.textContent = this.metrics.rebuffering.rebuffer_count.toString();
            }

            if (rebufferDurationElement) {
                rebufferDurationElement.textContent = this.metrics.rebuffering.rebuffer_duration.toFixed(2) + ' s';
            }

            if (rebufferRatioElement) {
                rebufferRatioElement.textContent = this.metrics.rebuffering.rebuffer_ratio.toFixed(2) + ' %';
            }
        } catch (error) {
            console.error('Error updating rebuffer display:', error);
        }
    }

    updateFrameDisplay() {
        try {
            const framePanel = document.getElementById('frameMetricsPanel');
            if (!framePanel) return;

            const droppedFramesElement = framePanel.querySelector('#droppedFramesValue');
            const totalFramesElement = framePanel.querySelector('#totalFramesValue');
            const frameRatioElement = framePanel.querySelector('#frameRatioValue');

            if (droppedFramesElement) {
                droppedFramesElement.textContent = this.metrics.frames.dropped_frames.toString();
            }

            if (totalFramesElement) {
                totalFramesElement.textContent = this.metrics.frames.total_frames.toString();
            }

            if (frameRatioElement) {
                frameRatioElement.textContent = this.metrics.frames.dropped_frame_ratio.toFixed(2) + ' %';
            }
        } catch (error) {
            console.error('Error updating frame display:', error);
        }
    }

    /**
     * Panel creation methods
     */
    createStartupPanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) return;

            const startupPanel = document.createElement('article');
            startupPanel.className = 'card';
            startupPanel.id = 'startupMetricsPanel';

            startupPanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-rocket"></i>
                        Startup Performance
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Startup Time:</span>
                            <span class="info-item__value" id="startupTimeValue">-</span>
                        </div>
                    </div>
                </div>
            `;

            dashboardGrid.appendChild(startupPanel);
            console.log('Startup metrics panel created');
        } catch (error) {
            console.error('Error creating startup panel:', error);
        }
    }

    createRebufferPanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) return;

            const rebufferPanel = document.createElement('article');
            rebufferPanel.className = 'card';
            rebufferPanel.id = 'rebufferMetricsPanel';

            rebufferPanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-pause-circle"></i>
                        Rebuffering Metrics
                    </h2>
                </header>
                <div class="card__content">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-item__label">Rebuffer Count:</span>
                            <span class="info-item__value" id="rebufferCountValue">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Rebuffer Duration:</span>
                            <span class="info-item__value" id="rebufferDurationValue">0.00 s</span>
                        </div>
                        <div class="info-item">
                            <span class="info-item__label">Rebuffer Ratio:</span>
                            <span class="info-item__value" id="rebufferRatioValue">0.00 %</span>
                        </div>
                    </div>
                </div>
            `;

            dashboardGrid.appendChild(rebufferPanel);
            console.log('Rebuffer metrics panel created');
        } catch (error) {
            console.error('Error creating rebuffer panel:', error);
        }
    }

    createFramePanel() {
        try {
            const dashboardGrid = document.querySelector('.dashboard__grid');
            if (!dashboardGrid) return;

            const framePanel = document.createElement('article');
            framePanel.className = 'card';
            framePanel.id = 'frameMetricsPanel';

            framePanel.innerHTML = `
                <header class="card__header">
                    <h2 class="card__title">
                        <i class="fas fa-film"></i>
                        Frame Statistics
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
                            <span class="info-item__value" id="frameRatioValue">0.00 %</span>
                        </div>
                    </div>
                </div>
            `;

            dashboardGrid.appendChild(framePanel);
            console.log('Frame metrics panel created');
        } catch (error) {
            console.error('Error creating frame panel:', error);
        }
    }

    /**
     * Utility methods
     */
    triggerPlayingEvent() {
        // Trigger playing event for rebuffer detection
        this.endRebufferMeasurement();
    }

    forceUpdateDisplay() {
        this.updateStartupDisplay();
        this.updateRebufferDisplay();
        this.updateFrameDisplay();
    }

    /**
     * Get metrics methods
     */
    getStartupMetrics() {
        return { ...this.metrics.startup };
    }

    getRebufferMetrics() {
        return { ...this.metrics.rebuffering };
    }

    getFrameMetrics() {
        return { ...this.metrics.frames };
    }

    getFPSMetrics() {
        return { ...this.metrics.fps };
    }

    /**
     * Cleanup
     */
    cleanup() {
        try {
            this.removeVideoEventListeners();
            this.stopFrameStatsMonitoring();
            this.stopFPSMonitoring();

            if (this.realTimeUpdateInterval) {
                clearInterval(this.realTimeUpdateInterval);
            }

            console.log('PerformanceTracker cleanup completed');
        } catch (error) {
            console.error('Error during PerformanceTracker cleanup:', error);
        }
    }
}