/**
 * HLSPlayer - Quản lý HLS player và các event liên quan
 */
export default class HLSPlayer {
    constructor(videoElement, memoryManager) {
        this.videoElement = videoElement;
        this.memoryManager = memoryManager;
        this.hlsInstance = null;
        this.isLiveStream = false;
        this.streamAnalytics = null;
        this.performanceTracker = null;

        this.initializeVideoEvents();
    }

    /**
     * Khởi tạo video events
     */
    initializeVideoEvents() {
        if (!this.videoElement) return;

        // Remove controls attribute để đảm bảo không có controls hiển thị
        this.videoElement.removeAttribute('controls');
        this.videoElement.controls = false;

        // Event listeners cho live indicator và startup measurement
        this.memoryManager.addEventListener(this.videoElement, 'play', () => {
            this.onVideoPlay();
        });

        this.memoryManager.addEventListener(this.videoElement, 'playing', () => {
            this.onVideoPlaying();
        });

        this.memoryManager.addEventListener(this.videoElement, 'pause', () => {
            this.onVideoPause();
        });

        this.memoryManager.addEventListener(this.videoElement, 'ended', () => {
            this.onVideoEnded();
        });

        // Event to handle resume from pause (different from initial play)
        this.memoryManager.addEventListener(this.videoElement, 'timeupdate', () => {
            // Check if video was paused and is now playing (resume scenario)
            if (this.performanceTracker &&
                this.performanceTracker.metrics.playback &&
                this.performanceTracker.metrics.playback.is_paused &&
                !this.videoElement.paused &&
                !this.performanceTracker.metrics.playback.is_buffering) {
                // Resume playback if method exists
                if (typeof this.performanceTracker.resumePlaybackTimer === 'function') {
                    this.performanceTracker.resumePlaybackTimer();
                }
            }
        });
    }

    /**
     * Set performance tracker instance
     */
    setPerformanceTracker(tracker) {
        this.performanceTracker = tracker;

        // Attach video element để enable event-based rebuffer detection
        if (tracker && this.videoElement) {
            if (typeof tracker.attachVideoElement === 'function') {
                tracker.attachVideoElement(this.videoElement);
                console.log('Video element attached to PerformanceTracker for event-based detection');
            }
        }
    }

    /**
     * Xử lý khi video play
     */
    onVideoPlay() {
        this.showLiveIndicator();
        this.updatePlayPauseButton();

        // Bắt đầu đo startup time
        if (this.performanceTracker) {
            if (typeof this.performanceTracker.startStartupMeasurement === 'function') {
                this.performanceTracker.startStartupMeasurement();
            }
            if (typeof this.performanceTracker.startWatchTime === 'function') {
                this.performanceTracker.startWatchTime();
            }
        }
    }

    /**
     * Xử lý khi video playing (first frame rendered)
     */
    onVideoPlaying() {
        this.showLiveIndicator();
        this.updatePlayPauseButton();

        // Ghi nhận first frame rendering
        if (this.performanceTracker && typeof this.performanceTracker.recordFirstFrame === 'function') {
            this.performanceTracker.recordFirstFrame();
        }
    }

    /**
     * Xử lý khi video pause
     */
    onVideoPause() {
        this.hideLiveIndicator();
        this.updatePlayPauseButton();

        // Pause playback time tracking - only if method exists
        if (this.performanceTracker && typeof this.performanceTracker.pausePlaybackTimer === 'function') {
            this.performanceTracker.pausePlaybackTimer();
        }
    }

    /**
     * Xử lý khi video ended
     */
    onVideoEnded() {
        this.hideLiveIndicator();
        this.updatePlayPauseButton();
    }

    /**
     * Load HLS stream
     */
    async loadStream(url) {
        if (!this.videoElement) {
            throw new Error('Video player not available');
        }

        try {
            // Destroy existing HLS instance
            this.destroyHLS();

            // Reset startup metrics cho stream mới
            if (this.performanceTracker) {
                if (typeof this.performanceTracker.resetStartupMetrics === 'function') {
                    this.performanceTracker.resetStartupMetrics();
                }
                if (typeof this.performanceTracker.resetRebufferMetrics === 'function') {
                    this.performanceTracker.resetRebufferMetrics();
                }
                if (typeof this.performanceTracker.resetSegmentMetrics === 'function') {
                    this.performanceTracker.resetSegmentMetrics();
                }
            }

            if (Hls.isSupported() && window.Hls) {
                await this.loadHLSStream(url);
            } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                await this.loadNativeHLS(url);
            } else {
                throw new Error('HLS is not supported in this browser');
            }
        } catch (error) {
            console.error('Error loading stream:', error);
            throw error;
        }
    }

    /**
     * Load HLS stream using HLS.js
     */
    async loadHLSStream(url) {
        return new Promise((resolve, reject) => {
            try {
                this.hlsInstance = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    maxBufferSize: 60 * 1000 * 1000,
                    maxBufferHole: 0.5,
                    highBufferWatchdogPeriod: 2,
                    nudgeOffset: 0.1,
                    nudgeMaxRetry: 3,
                    maxFragLookUpTolerance: 0.25,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: Infinity,
                    liveDurationInfinity: false,
                    liveBackBufferLength: Infinity,
                    maxLiveSyncPlaybackRate: 1
                });

                // Setup event listeners
                this.setupHLSEvents(resolve, reject);

                // Load source
                this.hlsInstance.loadSource(url);
                this.hlsInstance.attachMedia(this.videoElement);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Setup HLS.js event listeners
     */
    setupHLSEvents(resolve, reject) {
        // Error handling
        this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            this.handleHLSError(event, data, reject);
        });

        // Manifest loaded
        this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('Manifest loaded, found ' + data.levels.length + ' quality levels');
            resolve(data);
        });

        // Fragment loading started event for accurate load time measurement
        this.hlsInstance.on(Hls.Events.FRAG_LOADING, (event, data) => {
            if (data.frag && this.performanceTracker) {
                // Store loading start time for accurate measurement using high-precision timing
                data.frag.loadStartTime = performance.now();
                console.log('Fragment loading started:', data.frag.url);
            }
        });

        // Media attached
        this.hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('Video element attached to HLS.js');
        });

        // HLS buffer events - now used for logging only
        this.hlsInstance.on(Hls.Events.BUFFER_EMPTY, (event, data) => {
            console.log('HLS Buffer empty detected');
        });

        this.hlsInstance.on(Hls.Events.BUFFER_APPENDED, (event, data) => {
            console.log('HLS Buffer appended');
        });

        this.hlsInstance.on(Hls.Events.BUFFER_FLUSHED, (event, data) => {
            console.log('HLS Buffer flushed');
        });

        // Fragment loaded event for startup measurement, frame statistics and segment tracking
        this.hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
            if (this.performanceTracker) {
                // Startup measurement - record first frame rendering
                if (this.performanceTracker.isStartupMeasurementActive &&
                    this.videoElement && !this.videoElement.paused) {
                    if (typeof this.performanceTracker.recordFirstFrame === 'function') {
                        this.performanceTracker.recordFirstFrame();
                    }
                }

                // Update frame statistics when fragments are loaded
                if (typeof this.performanceTracker.updateFrameStats === 'function') {
                    this.performanceTracker.updateFrameStats();
                }

                // Track segment duration and load time with high precision
                if (data.frag) {
                    const segmentDuration = data.frag.duration || 0;

                    // Calculate accurate load time using our stored start time
                    let segmentLoadTime = null;
                    if (data.frag.loadStartTime) {
                        segmentLoadTime = performance.now() - data.frag.loadStartTime;
                    } else if (data.stats && data.stats.loading) {
                        // Fallback to HLS.js stats if available
                        segmentLoadTime = data.stats.loading.end - data.stats.loading.start;
                    }

                    if (typeof this.performanceTracker.onSegmentLoaded === 'function') {
                        this.performanceTracker.onSegmentLoaded(segmentDuration, segmentLoadTime);
                    }

                    console.log('Fragment loaded - Duration:', segmentDuration.toFixed(3) + 's',
                        'Load time:', segmentLoadTime ? segmentLoadTime.toFixed(2) + 'ms' : 'N/A');
                }
            }
        });

        // Fragment load progress for detailed tracking and real-time updates
        this.hlsInstance.on(Hls.Events.FRAG_LOAD_PROGRESS, (event, data) => {
            if (this.performanceTracker && data.frag && data.stats) {
                // Track loading progress for potential real-time display updates
                const progressPercent = data.stats.loaded / data.stats.total * 100;
                // Could emit progress events here for advanced UI updates
            }
        });

        // Fragment load emergency abort - track failed loads
        this.hlsInstance.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, (event, data) => {
            if (this.performanceTracker && data.frag) {
                console.warn('Fragment load emergency aborted:', data.frag.url);
                // Could track failed segment loads here for error analysis
            }
        });
    }

    /**
     * Load native HLS (Safari)
     */
    async loadNativeHLS(url) {
        return new Promise((resolve, reject) => {
            const onLoadedMetadata = () => {
                this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                this.videoElement.removeEventListener('error', onError);
                resolve();
            };

            const onError = (error) => {
                this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                this.videoElement.removeEventListener('error', onError);
                reject(error);
            };

            this.videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
            this.videoElement.addEventListener('error', onError);
            this.videoElement.src = url;
        });
    }

    /**
     * Handle HLS errors
     */
    handleHLSError(event, data, reject) {
        console.error('HLS Error:', data);

        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('Fatal network error encountered, trying to recover');
                    this.hlsInstance.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('Fatal media error encountered, trying to recover');
                    this.hlsInstance.recoverMediaError();
                    break;
                default:
                    console.error('Fatal error, cannot recover');
                    this.destroyHLS();
                    if (reject) reject(new Error(`HLS Error: ${data.type}`));
                    break;
            }
        }
    }

    /**
     * Destroy HLS instance
     */
    destroyHLS() {
        if (this.hlsInstance) {
            try {
                this.hlsInstance.destroy();
            } catch (error) {
                console.warn('Error destroying HLS instance:', error);
            }
            this.hlsInstance = null;
        }
    }

    /**
     * Show live indicator
     */
    showLiveIndicator() {
        try {
            const liveIndicator = document.getElementById('liveIndicator');
            if (liveIndicator) {
                liveIndicator.style.display = 'flex';
                liveIndicator.style.position = 'absolute';
                liveIndicator.style.top = '16px';
                liveIndicator.style.left = '16px';
                liveIndicator.style.zIndex = '20';
                this.isLiveStream = true;
            }
        } catch (error) {
            console.error('Error showing live indicator:', error);
        }
    }

    /**
     * Hide live indicator
     */
    hideLiveIndicator() {
        try {
            const liveIndicator = document.getElementById('liveIndicator');
            if (liveIndicator) {
                liveIndicator.style.display = 'none';
                this.isLiveStream = false;
            }
        } catch (error) {
            console.error('Error hiding live indicator:', error);
        }
    }

    /**
     * Update play/pause button
     */
    updatePlayPauseButton() {
        try {
            const playPauseBtn = document.getElementById('playPauseBtn');
            if (playPauseBtn && this.videoElement) {
                const icon = playPauseBtn.querySelector('i');
                if (icon) {
                    if (this.videoElement.paused) {
                        icon.className = 'fas fa-play';
                        playPauseBtn.title = 'Play';
                    } else {
                        icon.className = 'fas fa-pause';
                        playPauseBtn.title = 'Pause';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating play/pause button:', error);
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        try {
            if (!this.videoElement) return;

            if (this.videoElement.paused) {
                this.videoElement.play();
            } else {
                this.videoElement.pause();
            }
        } catch (error) {
            console.error('Error toggling play/pause:', error);
        }
    }

    /**
     * Stop video
     */
    stop() {
        try {
            if (!this.videoElement) return;

            this.videoElement.pause();
            this.videoElement.currentTime = 0;
            this.hideLiveIndicator();
            this.destroyHLS();
            this.updatePlayPauseButton();
        } catch (error) {
            console.error('Error stopping video:', error);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.destroyHLS();
        if (this.streamAnalytics) {
            this.streamAnalytics.stopMonitoring();
            this.streamAnalytics = null;
        }
    }
}