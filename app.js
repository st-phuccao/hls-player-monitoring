import MemoryManager from './js/core/MemoryManager.js';
import PerformanceTracker from './js/core/PerformanceTracker.js';

import ErrorTracker from './js/core/ErrorTracker.js';
import DataConsumptionTracker from './js/core/DataConsumptionTracker.js';
import MetricsDataManager from './js/core/MetricsDataManager.js';
import UIManager from './js/ui/UIManager.js';
import ProfessionalDashboard from './js/ui/ProfessionalDashboard.js';
import {
    integrateTrackingComponents,
    handleVideoEventError,
    initializeNativeHLSFallback,
    initializeComprehensiveErrorHandling,
    integrateAllComponents,

    createFallbackErrorTracker,
    createFallbackDataTracker
} from './js/core/ComponentIntegrator.js';

// Ứng dụng HLS Stream Monitor - cấu hình trạng thái chính
const appState = {
    hlsPlayer: null,
    videoElement: null,
    autoLoadTimeout: null,
    lastValidUrl: null,
    isLiveStream: false,
    liveStatusCheckInterval: null,
    userAnalytics: null,
    streamAnalytics: null,
    performanceTracker: null,

    errorTracker: null,
    dataConsumptionTracker: null,
    metricsDataManager: null,
    performanceMonitor: null,
    memoryCleanupInterval: null,
    professionalDashboard: null
};

const updateQueue = [];
let isUpdating = false;

const memoryManager = new MemoryManager();
let uiManager = null;

let hlsPlayer = null;
let videoElement = null;
let autoLoadTimeout = null;
let lastValidUrl = null;
let isLiveStream = false;
let liveStatusCheckInterval = null;
let userAnalytics = null;
let streamAnalytics = null;
let performanceTracker = null;

let errorTracker = null;
let dataConsumptionTracker = null;
let metricsDataManager = null;
let performanceMonitor = null;
let memoryCleanupInterval = null;
let professionalDashboard = null;

function setAppState(key, value) {
    if (!(key in appState)) {
        throw new Error(`Unknown appState key: ${key}`);
    }

    appState[key] = value;

    switch (key) {
        case 'hlsPlayer':
            hlsPlayer = value;
            break;
        case 'videoElement':
            videoElement = value;
            break;
        case 'autoLoadTimeout':
            autoLoadTimeout = value;
            break;
        case 'lastValidUrl':
            lastValidUrl = value;
            break;
        case 'isLiveStream':
            isLiveStream = value;
            break;
        case 'liveStatusCheckInterval':
            liveStatusCheckInterval = value;
            break;
        case 'userAnalytics':
            userAnalytics = value;
            break;
        case 'streamAnalytics':
            streamAnalytics = value;
            break;
        case 'performanceTracker':
            performanceTracker = value;
            break;

        case 'errorTracker':
            errorTracker = value;
            break;
        case 'dataConsumptionTracker':
            dataConsumptionTracker = value;
            break;
        case 'metricsDataManager':
            metricsDataManager = value;
            break;
        case 'performanceMonitor':
            performanceMonitor = value;
            break;
        case 'memoryCleanupInterval':
            memoryCleanupInterval = value;
            break;
        case 'professionalDashboard':
            professionalDashboard = value;
            break;
        default:
            break;
    }

    return value;
}

// Global error handlers for unhandled errors
window.addEventListener('error', function (event) {
    console.error('Global error caught:', event.error);
    showGlobalError(`Unexpected error: ${event.error?.message || 'Unknown error occurred'}. Please refresh the page if issues persist.`);
});

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
    showGlobalError(`Promise error: ${event.reason?.message || 'An async operation failed'}. Please try again.`);
    // Prevent the default browser behavior
    event.preventDefault();
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    try {
        console.log('HLS Stream Monitor initialized');
        showGlobalLoading(true, 'Initializing application...');

        uiManager = new UIManager(memoryManager);
        uiManager.setAccessibleCallbacks({
            onError: (message) => showAccessibleError(message),
            onSuccess: (message) => showAccessibleSuccess(message)
        });

        // Expose helper cho inline HTML handlers
        window.toggleKeyboardHelp = () => uiManager && uiManager.toggleKeyboardHelp();

        // Lắng nghe các sự kiện tuỳ chỉnh từ UIManager
        const handleTogglePlayPause = () => {
            try {
                if (!videoElement) {
                    showGlobalError('Video player not ready. Please load a stream first.');
                    return;
                }

                if (!videoElement.src && !hlsPlayer) {
                    showGlobalError('No stream loaded. Please click the "Load Stream" button first to load the stream.');
                    return;
                }

                if (videoElement.paused) {
                    const playPromise = videoElement.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('Play failed:', error);
                            showGlobalError('Failed to play video: ' + error.message);
                        });
                    }
                } else {
                    videoElement.pause();
                }
            } catch (error) {
                console.error('Error toggling playback via UIManager event:', error);
                showGlobalError('Failed to toggle playback: ' + error.message);
            }
        };

        const handleStopVideo = () => {
            stopVideo();
        };

        const handleReloadStream = () => {
            handleLoadStream();
        };

        memoryManager.addEventListener(document, 'togglePlayPause', handleTogglePlayPause);
        memoryManager.addEventListener(document, 'stopVideo', handleStopVideo);
        memoryManager.addEventListener(document, 'reloadStream', handleReloadStream);



        // Initialize comprehensive error handling first
        const apiSupport = initializeComprehensiveErrorHandling(errorTracker, showGlobalError, showGlobalMessage);

        // Initialize components with comprehensive error handling
        initializePerformanceTracker();

        initializeErrorTracker();
        initializeDataConsumptionTracker();
        initializeMetricsDataManager();
        initializeHLSPlayer();
        initializeUserAnalytics();
        initializeDashboard();

        // Initialize professional dashboard first
        initializeProfessionalDashboard();

        // Integrate all components after initialization
        setTimeout(() => {
            try {
                const components = {
                    performanceTracker,

                    errorTracker,
                    dataConsumptionTracker,
                    metricsDataManager,
                    professionalDashboard,
                    hlsPlayer
                };
                integrateAllComponents(components, showGlobalMessage, showGlobalError);
            } catch (error) {
                console.error('Error during component integration:', error);
                showGlobalMessage('Some monitoring features may have limited functionality.', 'warning');
            }
        }, 1000);

        // Create segment panel after dashboard is initialized
        if (performanceTracker) {
            performanceTracker.createSegmentPanel();
        }

        initializePerformanceMonitoring();
        initializeMemoryCleanup();
        checkDependencies();

        // Initialize performance optimizations
        optimizeMediaLoading();
        initializeLazyFeatures();
        initializeServiceWorker();

        showGlobalLoading(false);
        showGlobalMessage('Application ready! Click "Load Stream" to start monitoring an HLS stream.', 'success');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showGlobalLoading(false);
        showGlobalError('Failed to initialize application. Please refresh the page and try again.');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function () {
    try {
        memoryManager.cleanup();
        if (hlsPlayer) {
            hlsPlayer.destroy();
            setAppState('hlsPlayer', null);
        }
        if (streamAnalytics) {
            streamAnalytics.stopMonitoring();
            setAppState('streamAnalytics', null);
        }

        if (errorTracker) {
            errorTracker.cleanup();
            setAppState('errorTracker', null);
        }
        if (dataConsumptionTracker) {
            dataConsumptionTracker.cleanup();
            setAppState('dataConsumptionTracker', null);
        }
        if (metricsDataManager) {
            metricsDataManager.cleanup();
            setAppState('metricsDataManager', null);
        }
        if (professionalDashboard) {
            professionalDashboard.cleanup();
            setAppState('professionalDashboard', null);
        }
    } catch (error) {
        console.warn('Error during cleanup:', error);
    }
});

// Old local functions removed - now using ComponentIntegrator module

// Old initializeNativeHLSFallback function removed - now using ComponentIntegrator module

// Old checkTimingAPISupport function removed - now using ComponentIntegrator module

// All old local functions removed - now using ComponentIntegrator module for:

// - createFallbackErrorTracker  
// - createFallbackDataTracker
// - initializeComprehensiveErrorHandling
// - integrateAllComponents
// - setupCrossComponentCommunication
// - testIntegrationWithNetworkConditions

/**
 * Reorder dashboard cards according to importance
 * Order: Performance Overview -> User Information -> Error Tracking -> Network Metrics -> Data Consumption -> Frame Performance -> Segment Performance -> Metrics Export
 */
function reorderDashboardCards() {
    try {
        const dashboardGrid = document.querySelector('.dashboard__grid');
        if (!dashboardGrid) return;

        // Move Network Metrics card to position 4 (after Error Tracking)
        const networkCard = document.getElementById('networkMetricsCard');
        const dataCard = document.getElementById('dataConsumptionPanel');

        if (networkCard && dataCard) {
            // Insert Network Metrics before Data Consumption
            dashboardGrid.insertBefore(networkCard, dataCard);
            console.log('Network Metrics card moved to correct position');
        }

        console.log('Dashboard cards reordered according to importance');
    } catch (error) {
        console.error('Error reordering dashboard cards:', error);
    }
}

/**
 * Initialize Performance Tracker
 */
function initializePerformanceTracker() {
    try {
        setAppState('performanceTracker', new PerformanceTracker());

        // Create the overview panel immediately so users can see it's ready
        performanceTracker.createOverviewPanel();

        // Reorder dashboard cards according to importance
        setTimeout(() => {
            reorderDashboardCards();
        }, 3000);



        // Create the frame panel immediately so users can see it's ready
        performanceTracker.createFramePanel();

        console.log('Performance tracker initialized successfully');
    } catch (error) {
        console.error('Failed to initialize performance tracker:', error);
        showGlobalError('Failed to initialize performance tracking. Some metrics may not be available.');
    }
}



/**
 * Initialize Error Tracker with comprehensive error handling
 */
function initializeErrorTracker() {
    try {
        setAppState('errorTracker', new ErrorTracker());

        // Verify error tracker functionality
        if (errorTracker && typeof errorTracker.recordError === 'function') {
            console.log('Error tracker initialized successfully with full functionality');
        } else {
            throw new Error('Error tracker missing required methods');
        }
    } catch (error) {
        console.error('Failed to initialize error tracker:', error);

        // Create fallback error tracker
        try {
            const fallbackErrorTracker = createFallbackErrorTracker();
            setAppState('errorTracker', fallbackErrorTracker);
            console.log('Fallback error tracker initialized');
            showGlobalMessage('Error tracking running in limited mode', 'warning');
        } catch (fallbackError) {
            console.error('Failed to create fallback error tracker:', fallbackError);
            showGlobalError('Failed to initialize error tracking. Some metrics may not be available.');
        }
    }
}

/**
 * Initialize Data Consumption Tracker with comprehensive error handling
 */
function initializeDataConsumptionTracker() {
    try {
        setAppState('dataConsumptionTracker', new DataConsumptionTracker());

        // Verify data consumption tracker functionality
        if (dataConsumptionTracker && typeof dataConsumptionTracker.getDataMetrics === 'function') {
            console.log('Data consumption tracker initialized successfully with full functionality');
        } else {
            throw new Error('Data consumption tracker missing required methods');
        }
    } catch (error) {
        console.error('Failed to initialize data consumption tracker:', error);

        // Create fallback data consumption tracker
        try {
            const fallbackDataTracker = createFallbackDataTracker();
            setAppState('dataConsumptionTracker', fallbackDataTracker);
            console.log('Fallback data consumption tracker initialized');
            showGlobalMessage('Data consumption tracking running in limited mode', 'warning');
        } catch (fallbackError) {
            console.error('Failed to create fallback data consumption tracker:', fallbackError);
            showGlobalError('Failed to initialize data consumption tracking. Some metrics may not be available.');
        }
    }
}

/**
 * Initialize Metrics Data Manager
 */
function initializeMetricsDataManager() {
    try {
        setAppState('metricsDataManager', new MetricsDataManager());

        // Initialize with tracker instances after a short delay to ensure all trackers are ready
        setTimeout(() => {
            if (metricsDataManager) {
                metricsDataManager.initialize({
                    performanceTracker: performanceTracker,

                    errorTracker: errorTracker,
                    dataConsumptionTracker: dataConsumptionTracker
                });

                // Start real-time aggregation
                metricsDataManager.startRealTimeAggregation(5000);

                // Expose global methods for metrics export
                window.exportMetrics = function (format = 'json', serverFormat = false) {
                    if (metricsDataManager) {
                        metricsDataManager.downloadMetricsFile(format, null, serverFormat);
                    }
                };

                window.getMetricsSnapshot = function () {
                    return metricsDataManager ? metricsDataManager.getMetricsSnapshot() : {};
                };

                window.getServerReadyData = function () {
                    return metricsDataManager ? metricsDataManager.getServerReadyData() : null;
                };

                window.createSummaryReport = function () {
                    return metricsDataManager ? metricsDataManager.createSummaryReport() : {};
                };

                // Debug methods for rebuffer tracking
                window.debugRebufferStatus = function () {
                    if (performanceTracker) {
                        const config = performanceTracker.getRebufferConfig();
                        const metrics = performanceTracker.getRebufferMetrics();
                        console.log('Rebuffer Debug Status:', {
                            config,
                            metrics,
                            videoElement: !!videoElement,
                            videoPaused: videoElement?.paused,
                            videoReadyState: videoElement?.readyState
                        });
                        return { config, metrics };
                    }
                    return null;
                };

                window.forcePlayingEvent = function () {
                    if (performanceTracker) {
                        performanceTracker.triggerPlayingEvent();
                        performanceTracker.forceUpdateDisplay();
                        console.log('Forced playing event and display update');
                    }
                };

                // Debug methods for data consumption tracking
                window.debugDataConsumption = function () {
                    if (dataConsumptionTracker) {
                        const debugInfo = dataConsumptionTracker.getDebugInfo();
                        console.log('Data Consumption Debug Info:', debugInfo);
                        return debugInfo;
                    }
                    return null;
                };

                window.simulateDataLoading = function () {
                    if (dataConsumptionTracker) {
                        dataConsumptionTracker.simulateDataLoading();
                        console.log('Simulated data loading - check the dashboard');
                    }
                };

                window.forceDataUpdate = function () {
                    if (dataConsumptionTracker) {
                        dataConsumptionTracker.updateDataDisplay();
                        console.log('Forced data display update');
                    }
                };

                window.testAllDataTracking = function () {
                    if (dataConsumptionTracker) {
                        console.log('=== Testing All Data Tracking Methods ===');

                        // Test 1: Simulate fragment loading
                        console.log('1. Simulating fragment loading...');
                        dataConsumptionTracker.simulateDataLoading();

                        // Test 2: Check buffer progress
                        console.log('2. Checking buffer progress...');
                        if (videoElement) {
                            dataConsumptionTracker.trackBufferProgress();
                        }

                        // Test 3: Force update
                        console.log('3. Forcing display update...');
                        dataConsumptionTracker.updateDataDisplay();

                        // Test 4: Show debug info
                        console.log('4. Current debug info:');
                        console.log(dataConsumptionTracker.getDebugInfo());

                        console.log('=== Test Complete ===');
                    }
                };

                // Expose components to global scope for debug tools
                window.dataConsumptionTracker = dataConsumptionTracker;
                window.hlsPlayer = hlsPlayer;
                window.videoElement = videoElement;
                window.performanceTracker = performanceTracker;

                // Debug methods for bitrate tracking
                window.debugBitrateTracking = function () {
                    if (performanceTracker) {
                        performanceTracker.debugBitrateTracking();
                    }
                };

                window.testBitrateUpdate = function (bitrate = 2000000) {
                    if (performanceTracker) {
                        console.log('Testing bitrate update with:', bitrate);
                        performanceTracker.updateBitrateMetrics(bitrate);
                        performanceTracker.updateRebufferDisplay();
                    }
                };

                // Create export panel in the dashboard
                createMetricsExportPanel();

                console.log('Metrics data manager initialized with tracker integration');
            }
        }, 1000);

        console.log('Metrics data manager initialized successfully');
    } catch (error) {
        console.error('Failed to initialize metrics data manager:', error);
        showGlobalError('Failed to initialize metrics data management. Some export features may not be available.');
    }
}

/**
 * Initialize Professional Dashboard
 */
function initializeProfessionalDashboard() {
    try {
        setAppState('professionalDashboard', new ProfessionalDashboard());

        // Set up global methods for enhanced metrics
        window.updateProfessionalMetric = function (elementId, value, thresholds) {
            if (professionalDashboard && professionalDashboard.isInitialized) {
                professionalDashboard.updateMetric(elementId, value, thresholds);
            }
        };

        window.updateProfessionalStatus = function (cardSelector, status, text) {
            if (professionalDashboard && professionalDashboard.isInitialized) {
                professionalDashboard.updateStatus(cardSelector, status, text);
            }
        };

        console.log('Professional dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize professional dashboard:', error);
        showGlobalError('Failed to initialize professional dashboard. Using fallback interface.');
    }
}

/**
 * Initialize HLS Player Component with comprehensive error handling and integration
 */
function initializeHLSPlayer() {
    try {
        setAppState('videoElement', document.getElementById('videoPlayer'));
        const streamUrlInput = document.getElementById('streamUrl');
        const loadStreamButton = document.getElementById('loadStream');
        const urlErrorElement = document.getElementById('urlError');

        if (!videoElement) {
            throw new Error('Video element not found in DOM');
        }

        // Remove controls attribute to ensure no controls are shown
        videoElement.removeAttribute('controls');
        videoElement.controls = false;

        // Check if HLS is supported with graceful degradation
        if (!window.Hls) {
            const errorMsg = 'HLS.js library failed to load. Please check your internet connection and refresh the page.';
            console.error('HLS.js not available:', errorMsg);
            showError(errorMsg);

            // Try to fallback to native HLS support
            if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('Falling back to native HLS support');
                showGlobalMessage('Using native HLS support (limited metrics available)', 'warning');
                const nativeHLS = initializeNativeHLSFallback(videoElement, showGlobalMessage, showGlobalError);
                if (nativeHLS) {
                    setAppState('hlsPlayer', nativeHLS);
                }
            } else {
                disableStreamInput();
            }
            return;
        }

        if (!Hls.isSupported()) {
            // Check if browser natively supports HLS (Safari)
            if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('HLS supported natively');
                showGlobalMessage('Using native HLS support (Safari)', 'info');
                const nativeHLS = initializeNativeHLSFallback(videoElement, showGlobalMessage, showGlobalError);
                if (nativeHLS) {
                    setAppState('hlsPlayer', nativeHLS);
                }
            } else {
                const errorMsg = 'HLS is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
                console.error('HLS not supported:', errorMsg);
                showError(errorMsg);
                disableStreamInput();
                return;
            }
        } else {
            console.log('HLS.js is supported');
        }

        // Add comprehensive video event listeners with error handling
        videoElement.addEventListener('play', function () {
            try {
                showLiveIndicator();
                updatePlayPauseButton();

                // Integrate all tracking components when video starts playing
                const components = { hlsPlayer, errorTracker, dataConsumptionTracker, performanceTracker, metricsDataManager, isLiveStream };
                integrateTrackingComponents('play', components);

                // Start startup time measurement when play() is called
                if (performanceTracker) {
                    performanceTracker.startStartupMeasurement();

                    // Attach video element FIRST before starting watch time
                    performanceTracker.attachVideoElement(videoElement);

                    // Now start watch time with video element attached
                    performanceTracker.startWatchTime();

                    performanceTracker.startFrameStatsMonitoring();
                    performanceTracker.startHybridFPSMonitoring();

                    // Connect HLS instance for bitrate and bandwidth tracking
                    if (hlsPlayer) {
                        performanceTracker.setHLSInstance(hlsPlayer);
                    }
                }

                // Update metrics data manager with stream URL
                if (metricsDataManager && streamUrlInput) {
                    metricsDataManager.setStreamUrl(streamUrlInput.value);
                }
            } catch (error) {
                console.error('Error in video play event handler:', error);
                handleVideoEventError('play', error, errorTracker, showGlobalMessage);
            }
        });

        videoElement.addEventListener('playing', function () {
            try {
                showLiveIndicator();
                updatePlayPauseButton();

                // Integrate all tracking components when video is actually playing
                const components = { hlsPlayer, errorTracker, dataConsumptionTracker, performanceTracker, metricsDataManager, isLiveStream };
                integrateTrackingComponents('playing', components);

                // Record first frame rendering for startup time calculation
                if (performanceTracker) {
                    performanceTracker.recordFirstFrame();

                    // Explicitly trigger playing event for event-based system
                    performanceTracker.triggerPlayingEvent();

                    // Force update display to ensure status changes immediately
                    setTimeout(() => {
                        performanceTracker.forceUpdateDisplay();
                    }, 100);

                    // Ensure frame monitoring is active when video starts playing
                    if (!performanceTracker.frameStatsInterval) {
                        performanceTracker.startFrameStatsMonitoring();
                    }
                    if (!performanceTracker.fpsAnimationFrame) {
                        performanceTracker.startHybridFPSMonitoring();
                    }
                }

                // Update live status in metrics
                if (metricsDataManager) {
                    metricsDataManager.setLiveStatus(isLiveStream);
                }
            } catch (error) {
                console.error('Error in video playing event handler:', error);
                handleVideoEventError('playing', error, errorTracker, showGlobalMessage);
            }
        });

        // Note: Rebuffering detection is now handled automatically by PerformanceTracker
        // through event-based detection when video element is attached
        // These events are kept for error tracking integration only

        videoElement.addEventListener('waiting', function () {
            try {
                console.log('Video waiting event - tracked by PerformanceTracker');
                // Buffering events are now tracked via network requests
            } catch (error) {
                console.error('Error in video waiting event handler:', error);
                handleVideoEventError('waiting', error, errorTracker, showGlobalMessage);
            }
        });

        videoElement.addEventListener('canplay', function () {
            try {
                console.log('Video canplay event - tracked by PerformanceTracker');
                // Buffer resume events are now tracked via network requests
            } catch (error) {
                console.error('Error in video canplay event handler:', error);
                handleVideoEventError('canplay', error, errorTracker, showGlobalMessage);
            }
        });

        videoElement.addEventListener('stalled', function () {
            try {
                console.log('Video stalled event - tracked by PerformanceTracker');
                // Record stall as potential error condition
                if (errorTracker) {
                    errorTracker.recordError('media', 'Video stalled', 'Video playback stalled, potential network or decoding issue');
                }
            } catch (error) {
                console.error('Error in video stalled event handler:', error);
                handleVideoEventError('stalled', error, errorTracker, showGlobalMessage);
            }
        });

        videoElement.addEventListener('pause', function () {
            try {
                hideLiveIndicator();
                updatePlayPauseButton();



                // Integrate tracking components for pause event
                const components = { hlsPlayer, errorTracker, dataConsumptionTracker, performanceTracker, metricsDataManager, isLiveStream };
                integrateTrackingComponents('pause', components);
            } catch (error) {
                console.error('Error in video pause event handler:', error);
                handleVideoEventError('pause', error, errorTracker, showGlobalMessage);
            }
        });

        videoElement.addEventListener('ended', function () {
            try {
                hideLiveIndicator();
                updatePlayPauseButton();

                // Stop frame monitoring when video ends
                if (performanceTracker) {
                    performanceTracker.stopFrameStatsMonitoring();
                    performanceTracker.stopFPSMonitoring();
                }

                // Integrate tracking components for end event
                const components = { hlsPlayer, errorTracker, dataConsumptionTracker, performanceTracker, metricsDataManager, isLiveStream };
                integrateTrackingComponents('ended', components);
            } catch (error) {
                console.error('Error in video ended event handler:', error);
                handleVideoEventError('ended', error, errorTracker, showGlobalMessage);
            }
        });

        // Add error event listener for video element
        videoElement.addEventListener('error', function (event) {
            try {
                const error = event.target.error;
                let errorMessage = 'Video playback error';
                let errorType = 'media';

                if (error) {
                    switch (error.code) {
                        case error.MEDIA_ERR_ABORTED:
                            errorMessage = 'Video playback was aborted';
                            break;
                        case error.MEDIA_ERR_NETWORK:
                            errorMessage = 'Network error occurred during video playback';
                            errorType = 'network';
                            break;
                        case error.MEDIA_ERR_DECODE:
                            errorMessage = 'Video decoding error';
                            break;
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = 'Video format not supported';
                            break;
                        default:
                            errorMessage = 'Unknown video error';
                            break;
                    }
                }

                console.error('Video element error:', errorMessage, error);

                // Record error in error tracker
                if (errorTracker) {
                    errorTracker.recordError(errorType, errorMessage, error?.message || 'Video element error', true);
                }

                showGlobalError(errorMessage);
            } catch (handlerError) {
                console.error('Error in video error event handler:', handlerError);
            }
        });

        // Add event listeners with error handling
        if (loadStreamButton) {
            loadStreamButton.addEventListener('click', function () {
                try {
                    handleLoadStream();
                } catch (error) {
                    console.error('Error in load stream handler:', error);
                    showError('Failed to load stream. Please try again.');
                }
            });
        } else {
            console.warn('Load stream button not found');
        }

        if (streamUrlInput) {
            streamUrlInput.addEventListener('keypress', function (e) {
                try {
                    if (e.key === 'Enter') {
                        handleLoadStream();
                    }
                } catch (error) {
                    console.error('Error in keypress handler:', error);
                    showError('Failed to process input. Please try again.');
                }
            });

            // Real-time validation as user types
            streamUrlInput.addEventListener('input', function (e) {
                try {
                    handleUrlInput(e.target.value);
                } catch (error) {
                    console.error('Error in input handler:', error);
                    // Don't show error for input validation failures
                }
            });

            // Validate on paste
            streamUrlInput.addEventListener('paste', function (e) {
                try {
                    // Use setTimeout to get the value after paste
                    setTimeout(() => {
                        try {
                            handleUrlInput(e.target.value);
                        } catch (error) {
                            console.error('Error processing pasted content:', error);
                        }
                    }, 10);
                } catch (error) {
                    console.error('Error in paste handler:', error);
                }
            });
        } else {
            console.warn('Stream URL input not found');
        }

        console.log('HLS Player initialized successfully');

        if (uiManager) {
            uiManager.updateMuteButton();
            uiManager.updateFullscreenButton();
        }
    } catch (error) {
        console.error('Failed to initialize HLS Player:', error);
        showGlobalError('Failed to initialize video player. Some features may not work properly.');
        disableStreamInput();
    }
}


/**
 * Initialize performance monitoring
 */
function initializePerformanceMonitoring() {
    try {
        const monitor = {
            metrics: {
                updateCount: 0,
                averageUpdateTime: 0,
                memoryUsage: 0,
                lastUpdate: Date.now()
            },

            startUpdate: () => {
                performanceMonitor.updateStartTime = performance.now();
            },

            endUpdate: () => {
                if (performanceMonitor.updateStartTime) {
                    const updateTime = performance.now() - performanceMonitor.updateStartTime;
                    performanceMonitor.metrics.updateCount++;
                    performanceMonitor.metrics.averageUpdateTime =
                        (performanceMonitor.metrics.averageUpdateTime * (performanceMonitor.metrics.updateCount - 1) + updateTime) /
                        performanceMonitor.metrics.updateCount;
                    performanceMonitor.metrics.lastUpdate = Date.now();
                }
            },

            getMemoryUsage: () => {
                if (performance.memory) {
                    return {
                        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                    };
                }
                return null;
            },

            logMetrics: () => {
                const memory = performanceMonitor.getMemoryUsage();
                console.log('Performance Metrics:', {
                    updates: performanceMonitor.metrics.updateCount,
                    avgUpdateTime: Math.round(performanceMonitor.metrics.averageUpdateTime * 100) / 100 + 'ms',
                    memory: memory ? `${memory.used}MB / ${memory.total}MB` : 'N/A'
                });
            }
        };

        setAppState('performanceMonitor', monitor);

        // Log performance metrics every 30 seconds
        const metricsInterval = setInterval(() => {
            performanceMonitor.logMetrics();
        }, 30000);

        memoryManager.addInterval(metricsInterval);

        console.log('Performance monitoring initialized');
    } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
    }
}

/**
 * Initialize memory cleanup for long-running sessions
 */
function initializeMemoryCleanup() {
    try {
        const cleanupInterval = setInterval(() => {
            try {
                // Clean up old chart data points (keep only last 50)
                if (window.networkChart && window.networkChart.data.datasets) {
                    window.networkChart.data.datasets.forEach(dataset => {
                        if (dataset.data && dataset.data.length > 50) {
                            dataset.data = dataset.data.slice(-50);
                        }
                    });

                    if (window.networkChart.data.labels && window.networkChart.data.labels.length > 50) {
                        window.networkChart.data.labels = window.networkChart.data.labels.slice(-50);
                    }
                }

                // Force garbage collection if available (Chrome DevTools)
                if (window.gc && typeof window.gc === 'function') {
                    window.gc();
                }

                // Log memory usage
                if (performanceMonitor) {
                    const memory = performanceMonitor.getMemoryUsage();
                    if (memory && memory.used > memory.limit * 0.8) {
                        console.warn('High memory usage detected:', memory);
                        showGlobalMessage('High memory usage detected. Consider refreshing the page.', 'warning');
                    }
                }

                console.log('Memory cleanup completed');
            } catch (cleanupError) {
                console.warn('Error during memory cleanup:', cleanupError);
            }
        }, 300000); // Every 5 minutes

        setAppState('memoryCleanupInterval', cleanupInterval);
        memoryManager.addInterval(cleanupInterval);

        console.log('Memory cleanup initialized');
    } catch (error) {
        console.error('Failed to initialize memory cleanup:', error);
    }
}

/**
 * Initialize network chart (wrapper for ChartManager)
 */
function initializeNetworkChart() {
    try {
        if (window.dashboard && window.dashboard.chartManager) {
            window.dashboard.chartManager.createNetworkChart();
        } else {
            console.warn('Dashboard or ChartManager not available for network chart initialization');
        }
    } catch (error) {
        console.error('Failed to initialize network chart:', error);
    }
}



/**
 * Lazy load non-critical features for better initial performance
 */
function initializeLazyFeatures() {
    try {
        // Lazy load chart initialization
        if (window.Chart && !window.networkChart) {
            const chartCanvas = document.getElementById('networkChart');
            if (chartCanvas) {
                // Use Intersection Observer to load chart when visible
                if (window.IntersectionObserver) {
                    const chartObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                initializeNetworkChart();
                                chartObserver.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.1 });

                    chartObserver.observe(chartCanvas);
                    memoryManager.addObserver(chartObserver);
                } else {
                    // Fallback: load after a delay
                    setTimeout(initializeNetworkChart, 2000);
                }
            }
        }



        console.log('Lazy features initialization set up');
    } catch (error) {
        console.error('Failed to initialize lazy features:', error);
    }
}

/**
 * Optimize images and media loading
 */
function optimizeMediaLoading() {
    try {
        // Add loading="lazy" to any images that don't have it
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
        });

        // Preload critical resources
        const criticalResources = [
            'https://cdn.jsdelivr.net/npm/hls.js@latest',
            'https://cdn.jsdelivr.net/npm/chart.js'
        ];

        criticalResources.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = url;
            document.head.appendChild(link);
        });

        console.log('Media loading optimized');
    } catch (error) {
        console.error('Failed to optimize media loading:', error);
    }
}

/**
 * Initialize service worker for caching (if supported)
 */
function initializeServiceWorker() {
    try {
        if ('serviceWorker' in navigator) {
            // Register service worker for caching
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('Service Worker registered:', registration);
            }).catch(error => {
                console.log('Service Worker registration failed:', error);
            });
        }
    } catch (error) {
        console.error('Failed to initialize service worker:', error);
    }
}

/**
 * Optimized batch update system for real-time data
 */
function batchUpdate(updateFunction) {
    updateQueue.push(updateFunction);

    if (!isUpdating) {
        isUpdating = true;
        requestAnimationFrame(() => {
            if (performanceMonitor) {
                performanceMonitor.startUpdate();
            }

            try {
                // Process all queued updates
                while (updateQueue.length > 0) {
                    const update = updateQueue.shift();
                    update();
                }
            } catch (error) {
                console.error('Error in batch update:', error);
            } finally {
                isUpdating = false;

                if (performanceMonitor) {
                    performanceMonitor.endUpdate();
                }
            }
        });
    }
}

/**
 * Create metrics export panel in the dashboard
 */
function createMetricsExportPanel() {
    try {
        const dashboardGrid = document.querySelector('.dashboard__grid');
        if (!dashboardGrid) {
            console.warn('Dashboard grid not found, cannot create metrics export panel');
            return;
        }

        const exportPanel = document.createElement('article');
        exportPanel.className = 'card';
        exportPanel.id = 'metricsExportPanel';

        exportPanel.innerHTML = `
            <header class="card__header">
                <h2 class="card__title">
                    <i class="fas fa-download"></i>
                    Metrics Export & Transmission
                </h2>
            </header>
            <div class="card__content">
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-item__label">Session ID:</span>
                        <span class="info-item__value" id="sessionIdValue">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-item__label">Data Status:</span>
                        <span class="info-item__value" id="dataStatusValue">Ready</span>
                    </div>
                    <div class="info-item">
                        <span class="info-item__label">Last Update:</span>
                        <span class="info-item__value" id="lastUpdateValue">-</span>
                    </div>
                </div>
                <div class="export-controls x-export">
                    <div class="x-export__grid">
                        <button id="exportJsonBtn" class="export-btn">Export JSON</button>
                        <button id="exportCsvBtn"  class="export-btn">Export CSV</button>
                        <button id="exportXmlBtn"  class="export-btn">Export XML</button>
                        <button id="createReportBtn" class="export-btn export-btn--primary">Summary Report</button>
                    </div>
                </div>
                </div>
            </div>
        `;

        // Insert at the end of the dashboard
        dashboardGrid.appendChild(exportPanel);

        // Set up event listeners for export buttons
        setupExportPanelEventListeners();

        // Update panel with current session info
        updateExportPanelInfo();

        console.log('Metrics export panel created');
    } catch (error) {
        console.error('Error creating metrics export panel:', error);
    }
}

/**
 * Set up event listeners for export panel buttons
 */
function setupExportPanelEventListeners() {
    try {
        // Enhanced export button handler with loading states
        const handleExportClick = async (button, exportFunction, buttonText) => {
            if (button.classList.contains('loading')) return;

            // Set loading state
            button.classList.add('loading');
            const originalText = button.textContent;
            button.textContent = 'Exporting...';

            try {
                await exportFunction();

                // Show success state
                button.classList.remove('loading');
                button.classList.add('success');
                button.textContent = 'Downloaded!';

                // Reset after 2 seconds
                setTimeout(() => {
                    button.classList.remove('success');
                    button.textContent = originalText;
                }, 2000);

            } catch (error) {
                console.error('Export failed:', error);
                button.classList.remove('loading');
                button.textContent = 'Failed';

                // Reset after 2 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            }
        };

        // Export JSON button
        document.getElementById('exportJsonBtn')?.addEventListener('click', (e) => {
            handleExportClick(e.target, async () => {
                if (metricsDataManager) {
                    metricsDataManager.downloadMetricsFile('json', null, false);
                }
            }, 'Export JSON');
        });

        // Export CSV button
        document.getElementById('exportCsvBtn')?.addEventListener('click', (e) => {
            handleExportClick(e.target, async () => {
                if (metricsDataManager) {
                    metricsDataManager.downloadMetricsFile('csv', null, false);
                }
            }, 'Export CSV');
        });

        // Export XML button
        document.getElementById('exportXmlBtn')?.addEventListener('click', (e) => {
            handleExportClick(e.target, async () => {
                if (metricsDataManager) {
                    metricsDataManager.downloadMetricsFile('xml', null, false);
                }
            }, 'Export XML');
        });

        // Server JSON export (if exists)
        document.getElementById('exportServerJsonBtn')?.addEventListener('click', (e) => {
            handleExportClick(e.target, async () => {
                if (metricsDataManager) {
                    metricsDataManager.downloadMetricsFile('json', null, true);
                }
            }, 'Server JSON');
        });

        // Summary Report button
        document.getElementById('createReportBtn')?.addEventListener('click', (e) => {
            handleExportClick(e.target, async () => {
                if (metricsDataManager) {
                    const report = metricsDataManager.createSummaryReport();
                    const reportJson = JSON.stringify(report, null, 2);

                    // Create and download report
                    const blob = new Blob([reportJson], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `hls-summary-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                }
            }, 'Summary Report');
        });

        document.getElementById('viewSnapshotBtn')?.addEventListener('click', () => {
            if (metricsDataManager) {
                const snapshot = metricsDataManager.getMetricsSnapshot();
                console.log('Current Metrics Snapshot:', snapshot);

                // Show in a modal or alert for demonstration
                const summaryText = `
Session Duration: ${snapshot.session?.session_duration?.toFixed(2) || 0}s
Startup Time: ${snapshot.startup?.startup_time?.toFixed(2) || 'N/A'}ms
Rebuffer Count: ${snapshot.rebuffering?.rebuffer_count || 0}
Rebuffer Ratio: ${snapshot.rebuffering?.rebuffer_ratio?.toFixed(2) || 0}%
Current Bitrate: ${snapshot.bitrate?.current_bitrate || 0} kbps
Frame Drop Ratio: ${snapshot.frames?.dropped_frame_ratio?.toFixed(2) || 0}%
Error Percentage: ${snapshot.errors?.error_percentage?.toFixed(2) || 0}%
                `.trim();

                alert('Current Metrics Snapshot:\n\n' + summaryText + '\n\nSee console for full details.');
            }
        });

        document.getElementById('transmitToServerBtn')?.addEventListener('click', async () => {
            const endpoint = document.getElementById('serverEndpoint')?.value;
            if (!endpoint) {
                alert('Please enter a server endpoint URL');
                return;
            }

            if (metricsDataManager) {
                try {
                    const button = document.getElementById('transmitToServerBtn');
                    button.textContent = 'Transmitting...';
                    button.disabled = true;

                    await metricsDataManager.transmitToServer(endpoint);
                    alert('Metrics successfully transmitted to server!');
                } catch (error) {
                    console.error('Transmission error:', error);
                    alert('Failed to transmit metrics: ' + error.message);
                } finally {
                    const button = document.getElementById('transmitToServerBtn');
                    button.textContent = 'Transmit to Server';
                    button.disabled = false;
                }
            }
        });

        console.log('Export panel event listeners set up');
    } catch (error) {
        console.error('Error setting up export panel event listeners:', error);
    }
}

/**
 * Update export panel with current session information
 */
function updateExportPanelInfo() {
    try {
        if (!metricsDataManager) return;

        const sessionIdElement = document.getElementById('sessionIdValue');
        const dataStatusElement = document.getElementById('dataStatusValue');
        const lastUpdateElement = document.getElementById('lastUpdateValue');

        const snapshot = metricsDataManager.getMetricsSnapshot();

        if (sessionIdElement && snapshot.session?.session_id) {
            sessionIdElement.textContent = snapshot.session.session_id.substring(0, 16) + '...';
            sessionIdElement.title = snapshot.session.session_id;
        }

        if (dataStatusElement) {
            const hasData = snapshot.session?.session_duration > 0;
            dataStatusElement.textContent = hasData ? 'Active' : 'Ready';
            dataStatusElement.className = hasData ? 'info-item__value bitrate-high' : 'info-item__value';
        }

        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
        }

        // Update every 10 seconds
        setTimeout(updateExportPanelInfo, 10000);
    } catch (error) {
        console.error('Error updating export panel info:', error);
    }
}

/**
 * Show live indicator for live streams
 */
function showLiveIndicator() {
    try {
        const liveIndicator = document.getElementById('liveIndicator');
        if (liveIndicator) {
            liveIndicator.style.display = 'flex';
            liveIndicator.style.position = 'absolute';
            liveIndicator.style.top = '16px';
            liveIndicator.style.left = '16px';
            liveIndicator.style.zIndex = '20';
            setAppState('isLiveStream', true);
            console.log('Live indicator shown with forced positioning');
        }
    } catch (error) {
        console.error('Error showing live indicator:', error);
    }
}

/**
 * Hide live indicator
 */
function hideLiveIndicator() {
    try {
        const liveIndicator = document.getElementById('liveIndicator');
        if (liveIndicator) {
            liveIndicator.style.display = 'none';
            setAppState('isLiveStream', false);
            console.log('Live indicator hidden');
        }
    } catch (error) {
        console.error('Error hiding live indicator:', error);
    }
}

/**
 * Stop video
 */
function stopVideo() {
    try {
        if (!videoElement) return;

        videoElement.pause();
        videoElement.currentTime = 0;
        hideLiveIndicator();

        // Destroy HLS player
        if (hlsPlayer) {
            hlsPlayer.destroy();
            setAppState('hlsPlayer', null);
        }

        updatePlayPauseButton();
    } catch (error) {
        console.error('Error stopping video:', error);
    }
}

/**
 * Update play/pause button icon
 */
function updatePlayPauseButton() {
    try {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (!playPauseBtn || !videoElement) return;

        const icon = playPauseBtn.querySelector('i');
        if (icon) {
            if (videoElement.paused) {
                icon.className = 'fas fa-play';
                playPauseBtn.classList.remove('playing');
            } else {
                icon.className = 'fas fa-pause';
                playPauseBtn.classList.add('playing');
            }
        }
    } catch (error) {
        console.error('Error updating play/pause button:', error);
    }
}

/**
 * Update mute button icon
 */
function updateMuteButton() {
    try {
        if (uiManager) {
            uiManager.updateMuteButton();
            return;
        }

        const muteBtn = document.getElementById('muteBtn');
        if (!muteBtn || !videoElement) return;

        const icon = muteBtn.querySelector('i');
        if (icon) {
            if (videoElement.muted) {
                icon.className = 'fas fa-volume-mute';
                muteBtn.classList.add('muted');
            } else {
                icon.className = 'fas fa-volume-up';
                muteBtn.classList.remove('muted');
            }
        }
    } catch (error) {
        console.error('Error updating mute button:', error);
    }
}

/**
 * Update fullscreen button icon
 */
function updateFullscreenButton() {
    try {
        if (uiManager) {
            uiManager.updateFullscreenButton();
            return;
        }

        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (!fullscreenBtn) return;

        const icon = fullscreenBtn.querySelector('i');
        if (icon) {
            if (document.fullscreenElement) {
                icon.className = 'fas fa-compress';
                fullscreenBtn.classList.add('fullscreen');
            } else {
                icon.className = 'fas fa-expand';
                fullscreenBtn.classList.remove('fullscreen');
            }
        }
    } catch (error) {
        console.error('Error updating fullscreen button:', error);
    }
}

/**
 * Enhanced error handling with accessibility announcements
 */
function showAccessibleError(message) {
    showError(message);
    if (uiManager) {
        uiManager.announceToScreenReader(`Error: ${message}`);
    }
}

/**
 * Enhanced success message with accessibility announcements
 */
function showAccessibleSuccess(message) {
    showGlobalMessage(message, 'success');
    if (uiManager) {
        uiManager.announceToScreenReader(`Success: ${message}`);
    }
}

/**
 * Performance-optimized element update with accessibility
 */
function updateElementAccessibly(element, newValue, oldValue) {
    if (uiManager && uiManager.updateElementAccessibly(element, newValue, oldValue)) {
        return true;
    }

    if (!element || newValue === oldValue) return false;

    try {
        element.textContent = newValue;
        element.classList.add('updating');
        const timeoutId = setTimeout(() => {
            element.classList.remove('updating');
        }, 300);
        memoryManager.addTimeout(timeoutId);
        return true;
    } catch (error) {
        console.error('Error updating element (fallback):', error);
        return false;
    }
}

/**
 * Memory-efficient debounce function
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);

        // Add timeout to memory manager
        memoryManager.addTimeout(timeout);
    };
}

/**
 * Memory-efficient throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            const timeout = setTimeout(() => inThrottle = false, limit);
            memoryManager.addTimeout(timeout);
        }
    };
}

/**
 * Update input visual state based on validation
 */
function updateInputState(state, errorMessage = null) {
    try {
        const streamUrlInput = document.getElementById('streamUrl');
        const loadStreamButton = document.getElementById('loadStream');
        const urlHelp = document.getElementById('urlHelp');

        if (!streamUrlInput || !loadStreamButton) {
            console.warn('Required input elements not found for state update');
            return;
        }

        // Remove existing state classes
        streamUrlInput.classList.remove('input--valid', 'input--invalid');
        loadStreamButton.disabled = false;

        switch (state) {
            case 'valid':
                streamUrlInput.classList.add('input--valid');
                loadStreamButton.disabled = false;
                clearError();
                if (urlHelp) {
                    urlHelp.innerHTML = '<i class="fas fa-check-circle"></i> Valid HLS stream URL - loading automatically...';
                    urlHelp.style.color = 'var(--color-success)';
                }
                break;

            case 'invalid':
                streamUrlInput.classList.add('input--invalid');
                loadStreamButton.disabled = true;
                if (errorMessage) {
                    showError(errorMessage);
                }
                if (urlHelp) {
                    urlHelp.textContent = 'Enter a valid HLS stream URL ending with .m3u8';
                    urlHelp.style.color = 'var(--text-muted)';
                }
                break;

            case 'loading':
                streamUrlInput.classList.add('loading-state');
                loadStreamButton.disabled = true;
                loadStreamButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                clearError();
                if (urlHelp) {
                    urlHelp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading stream...';
                    urlHelp.style.color = 'var(--color-primary)';
                }
                break;

            case 'default':
            default:
                streamUrlInput.classList.remove('loading-state');
                loadStreamButton.disabled = false;
                loadStreamButton.innerHTML = '<i class="fas fa-play"></i> Load Stream';
                clearError();
                if (urlHelp) {
                    urlHelp.textContent = 'Enter a valid HLS stream URL ending with .m3u8';
                    urlHelp.style.color = 'var(--text-muted)';
                }
                break;
        }
    } catch (error) {
        console.error('Error updating input state:', error);
        // Fallback: try to at least clear any error states
        try {
            clearError();
        } catch (clearError) {
            console.error('Failed to clear error in fallback:', clearError);
        }
    }
}

/**
 * Handle stream loading
 */
function handleLoadStream() {
    try {
        const streamUrlInput = document.getElementById('streamUrl');

        if (!streamUrlInput) {
            throw new Error('Stream URL input element not found');
        }

        const url = streamUrlInput.value.trim();

        if (!url) {
            showError('Please enter a stream URL');
            return;
        }

        const validationResult = validateHLSUrl(url);

        if (!validationResult.isValid) {
            showError(validationResult.error);
            updateInputState('invalid', validationResult.error);
            return;
        }

        // Clear any previous errors before loading
        clearError();
        loadHLSStream(url);

    } catch (error) {
        console.error('Error in handleLoadStream:', error);
        showError('Failed to process stream URL. Please try again.');
        updateConnectionStatus('error');
    }
}

/**
 * Handle URL input with real-time validation
 */
function handleUrlInput(url) {
    try {
        const streamUrlInput = document.getElementById('streamUrl');
        const loadStreamButton = document.getElementById('loadStream');

        // Clear any existing errors first
        clearError();

        if (!url || url.trim() === '') {
            // Empty input - reset to default state
            updateInputState('default');
            return;
        }

        const trimmedUrl = url.trim();

        // Validate URL with error handling
        let validationResult;
        try {
            validationResult = validateHLSUrl(trimmedUrl);
        } catch (validationError) {
            console.error('Error validating URL:', validationError);
            updateInputState('invalid', 'Failed to validate URL format');
            return;
        }

        if (validationResult.isValid) {
            updateInputState('valid');
            // Auto-play functionality - load stream automatically when valid URL is entered
            if (validationResult.shouldAutoLoad && trimmedUrl !== lastValidUrl) {
                // Clear any existing timeout
                if (autoLoadTimeout) {
                    clearTimeout(autoLoadTimeout);
                }

                // Set new timeout for auto-loading
                const timeoutId = setTimeout(() => {
                    try {
                        // Double-check that the URL is still valid and in the input field
                        const currentUrlElement = document.getElementById('streamUrl');
                        const currentUrl = currentUrlElement?.value?.trim();

                        if (currentUrl === trimmedUrl) {
                            setAppState('lastValidUrl', trimmedUrl);
                            loadHLSStream(trimmedUrl);
                        }
                    } catch (autoLoadError) {
                        console.error('Error in auto-load timeout:', autoLoadError);
                        showError('Failed to auto-load stream. Please try loading manually.');
                    }
                }, 1000); // 1 second delay to avoid too frequent loading

                setAppState('autoLoadTimeout', timeoutId);
                memoryManager.addTimeout(timeoutId);
            }
        } else {
            updateInputState('invalid', validationResult.error);
            // Clear auto-load timeout if URL becomes invalid
            if (autoLoadTimeout) {
                clearTimeout(autoLoadTimeout);
                setAppState('autoLoadTimeout', null);
            }
        }
    } catch (error) {
        console.error('Error in handleUrlInput:', error);
        updateInputState('invalid', 'Error processing URL input');
    }
}

/**
 * Enhanced HLS URL validation with detailed error messages and comprehensive error handling
 */
function validateHLSUrl(url) {
    try {
        // Check if URL is empty
        if (!url || typeof url !== 'string' || url.trim() === '') {
            return {
                isValid: false,
                error: 'Please enter a stream URL',
                shouldAutoLoad: false
            };
        }

        const trimmedUrl = url.trim();

        // Check for obviously invalid URLs
        if (trimmedUrl.length < 10) {
            return {
                isValid: false,
                error: 'URL appears to be too short to be valid',
                shouldAutoLoad: false
            };
        }

        // Check if it's a valid URL format
        let urlObj;
        try {
            urlObj = new URL(trimmedUrl);
        } catch (urlError) {
            // More specific error messages based on common URL errors
            if (trimmedUrl.includes(' ')) {
                return {
                    isValid: false,
                    error: 'URL contains spaces - please remove them',
                    shouldAutoLoad: false
                };
            }

            if (!trimmedUrl.includes('://')) {
                return {
                    isValid: false,
                    error: 'Please enter a complete URL starting with http:// or https://',
                    shouldAutoLoad: false
                };
            }

            return {
                isValid: false,
                error: 'Please enter a valid URL format',
                shouldAutoLoad: false
            };
        }

        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return {
                isValid: false,
                error: `Unsupported protocol "${urlObj.protocol}". Please use HTTP or HTTPS`,
                shouldAutoLoad: false
            };
        }

        // Check hostname
        if (!urlObj.hostname || urlObj.hostname.length < 3) {
            return {
                isValid: false,
                error: 'Invalid hostname in URL',
                shouldAutoLoad: false
            };
        }

        // Check for .m3u8 extension
        const pathname = urlObj.pathname.toLowerCase();
        if (!pathname.endsWith('.m3u8')) {
            return {
                isValid: false,
                error: 'HLS stream URL must end with .m3u8 extension',
                shouldAutoLoad: false
            };
        }

        // Check if URL looks like a valid HLS stream URL
        if (pathname === '/.m3u8' || pathname === '.m3u8' || pathname === '//.m3u8') {
            return {
                isValid: false,
                error: 'Invalid HLS stream path - URL appears incomplete',
                shouldAutoLoad: false
            };
        }

        // Additional checks for common HLS patterns
        if (pathname.includes('..') || pathname.includes('//')) {
            return {
                isValid: false,
                error: 'Invalid URL path - contains invalid characters',
                shouldAutoLoad: false
            };
        }

        // Check for suspicious patterns that might indicate a non-HLS URL
        const suspiciousPatterns = [
            /\.(html|htm|php|asp|jsp)$/i,
            /\.(jpg|jpeg|png|gif|bmp)$/i,
            /\.(mp4|avi|mov|wmv|flv)$/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(pathname))) {
            return {
                isValid: false,
                error: 'URL does not appear to be an HLS stream - should end with .m3u8',
                shouldAutoLoad: false
            };
        }

        // Check for common HLS stream patterns
        const commonHLSPatterns = [
            /\/playlist\.m3u8$/i,
            /\/index\.m3u8$/i,
            /\/master\.m3u8$/i,
            /\/stream\.m3u8$/i,
            /\/live\.m3u8$/i,
            /\/manifest\.m3u8$/i,
            /\.m3u8$/i
        ];

        const hasValidPattern = commonHLSPatterns.some(pattern => {
            try {
                return pattern.test(pathname);
            } catch (patternError) {
                console.warn('Error testing HLS pattern:', patternError);
                return false;
            }
        });

        if (!hasValidPattern) {
            return {
                isValid: false,
                error: 'URL does not match common HLS stream patterns',
                shouldAutoLoad: false
            };
        }

        // Additional validation for URL length (prevent extremely long URLs)
        if (trimmedUrl.length > 2048) {
            return {
                isValid: false,
                error: 'URL is too long - maximum 2048 characters allowed',
                shouldAutoLoad: false
            };
        }

        return {
            isValid: true,
            error: null,
            shouldAutoLoad: true
        };

    } catch (error) {
        console.error('Error in validateHLSUrl:', error);
        return {
            isValid: false,
            error: 'Failed to validate URL - please check the format and try again',
            shouldAutoLoad: false
        };
    }
}

/**
 * Legacy function for backward compatibility
 */
function isValidHLSUrl(url) {
    const result = validateHLSUrl(url);
    return result.isValid;
}

/**
 * Load HLS stream
 */
function loadHLSStream(url) {
    if (!videoElement) {
        showError('Video player not available');
        return;
    }

    // Update UI to show loading state
    showLoading(true);
    clearError();
    updateConnectionStatus('loading', 'Loading stream...');
    updateLoadingProgress(10, 'Initializing stream loader...');

    // Set a timeout for stream loading
    const loadTimeout = setTimeout(() => {
        showError('Stream loading timed out. Please check the URL and try again.');
        showLoading(false);
        updateConnectionStatus('error');
        resetStreamState();
    }, 30000); // 30 second timeout

    try {
        // Destroy existing HLS instance and reset live state
        if (hlsPlayer) {
            try {
                hlsPlayer.destroy();
            } catch (destroyError) {
                console.warn('Error destroying previous HLS instance:', destroyError);
            }
            setAppState('hlsPlayer', null);
        }

        // Reset live stream state
        resetLiveStreamState();

        // Reset startup metrics for new stream
        if (performanceTracker) {
            performanceTracker.resetStartupMetrics();
            performanceTracker.resetRebufferMetrics();
            performanceTracker.resetFrameMetrics();
            performanceTracker.resetBitrateAndBufferMetrics();
        }

        if (Hls.isSupported() && window.Hls) {
            // Use HLS.js for browsers that support it
            try {
                updateLoadingProgress(25, 'Creating HLS player...');
                const hlsInstance = new Hls({
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
                setAppState('hlsPlayer', hlsInstance);

                // Initialize StreamAnalytics with error handling
                try {
                    if (streamAnalytics) {
                        streamAnalytics.stopMonitoring();
                    }
                    setAppState('streamAnalytics', new StreamAnalytics(hlsPlayer, videoElement));
                } catch (analyticsError) {
                    console.warn('Failed to initialize stream analytics:', analyticsError);
                    // Continue without analytics
                }


                // Initialize ErrorTracker with HLS instance
                try {
                    if (errorTracker) {
                        errorTracker.resetErrorMetrics();
                        errorTracker.setHLSInstance(hlsPlayer);

                        // Set DataConsumptionTracker reference for total requests count
                        if (dataConsumptionTracker) {
                            errorTracker.setDataConsumptionTracker(dataConsumptionTracker);
                        }
                    }
                } catch (errorTrackerError) {
                    console.warn('Failed to initialize error tracking:', errorTrackerError);
                    // Continue without error tracking
                }

                // Initialize DataConsumptionTracker with HLS instance
                try {
                    if (dataConsumptionTracker) {
                        dataConsumptionTracker.resetDataMetrics();
                        dataConsumptionTracker.setHLSInstance(hlsPlayer);
                        // Set performance tracker for data efficiency calculations
                        if (performanceTracker) {
                            dataConsumptionTracker.setPerformanceTracker(performanceTracker);
                        }
                        // Set video element for additional tracking
                        if (videoElement) {
                            dataConsumptionTracker.setVideoElement(videoElement);
                        }
                    }
                } catch (dataTrackerError) {
                    console.warn('Failed to initialize data consumption tracking:', dataTrackerError);
                    // Continue without data consumption tracking
                }

                // Set up error handling
                hlsPlayer.on(Hls.Events.ERROR, handleHLSError);

                // Set up manifest loaded event
                hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                    try {
                        clearTimeout(loadTimeout);
                        updateLoadingProgress(50, 'Manifest loaded, initializing stream...');
                        console.log('Manifest loaded, found ' + data.levels.length + ' quality levels');

                        setTimeout(() => {
                            updateLoadingProgress(75, 'Starting stream playback...');
                            setTimeout(() => {
                                showLoading(false);
                                updateConnectionStatus('streaming');
                            }, 500);
                        }, 300);

                        // Start stream analytics monitoring
                        if (streamAnalytics) {
                            try {
                                streamAnalytics.startMonitoring();
                                streamAnalytics.metrics.stream.url = url;
                            } catch (analyticsError) {
                                console.warn('Failed to start stream analytics:', analyticsError);
                            }
                        }

                        // Detect if stream is live
                        detectLiveStream(data);

                        // Start periodic live status checking
                        startLiveStatusMonitoring();

                        // Update dashboard for stream start
                        updateDashboardForStream();

                        // Force update stream info after manifest is loaded
                        setTimeout(() => {
                            if (streamAnalytics && window.dashboard) {
                                window.dashboard.updateStreamInfo();
                            }
                        }, 1000);

                        // Auto-play the stream with better error handling
                        const playPromise = videoElement.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('Stream started playing successfully');
                                showGlobalMessage('Stream loaded successfully', 'success');
                            }).catch(function (error) {
                                console.log('Auto-play prevented:', error);
                                showError('Auto-play was prevented. Please click the play button to start the stream.');
                                updateConnectionStatus('ready');
                            });
                        }
                    } catch (manifestError) {
                        console.error('Error processing manifest:', manifestError);
                        showError('Failed to process stream manifest. The stream may be corrupted.');
                        showLoading(false);
                        updateConnectionStatus('error');
                    }
                });

                // Set up level loaded event to continuously check live status
                hlsPlayer.on(Hls.Events.LEVEL_LOADED, function (event, data) {
                    try {
                        updateLiveStatus(data);
                    } catch (levelError) {
                        console.warn('Error updating live status:', levelError);
                    }
                });

                // Set up media attached event
                hlsPlayer.on(Hls.Events.MEDIA_ATTACHED, function () {
                    console.log('Video element attached to HLS.js');
                });

                // Set up fragment loading event for segment load time measurement
                hlsPlayer.on(Hls.Events.FRAG_LOADING, function (event, data) {
                    try {
                        console.log('FRAG_LOADING event triggered', data);
                        if (data.frag && performanceTracker) {
                            // Store loading start time for accurate measurement using high-precision timing
                            data.frag.loadStartTime = performance.now();
                            console.log('Fragment loading started:', data.frag.url);
                        } else {
                            console.log('Missing data.frag or performanceTracker:', {
                                hasFrag: !!data.frag,
                                hasPerformanceTracker: !!performanceTracker
                            });
                        }
                    } catch (fragError) {
                        console.warn('Error in fragment loading handler:', fragError);
                    }
                });

                // Set up fragment loaded event for startup measurement and segment tracking
                hlsPlayer.on(Hls.Events.FRAG_LOADED, function (event, data) {
                    try {
                        console.log('FRAG_LOADED event triggered', data);

                        // Record first frame when first fragment is loaded and video is playing
                        if (performanceTracker && performanceTracker.isStartupMeasurementActive &&
                            videoElement && !videoElement.paused) {
                            performanceTracker.recordFirstFrame();
                        }

                        // Track segment duration and load time with high precision
                        if (performanceTracker && data.frag) {
                            const segmentDuration = data.frag.duration || 0;

                            // Calculate accurate load time using our stored start time
                            let segmentLoadTime = null;
                            if (data.frag.loadStartTime) {
                                segmentLoadTime = performance.now() - data.frag.loadStartTime;
                            } else if (data.stats && data.stats.loading) {
                                // Fallback to HLS.js stats if available
                                segmentLoadTime = data.stats.loading.end - data.stats.loading.start;
                            }

                            console.log('Calling performanceTracker.onSegmentLoaded with:', {
                                segmentDuration,
                                segmentLoadTime,
                                hasMethod: typeof performanceTracker.onSegmentLoaded === 'function'
                            });

                            performanceTracker.onSegmentLoaded(segmentDuration, segmentLoadTime);
                            console.log('Fragment loaded - Duration:', segmentDuration.toFixed(3) + 's',
                                'Load time:', segmentLoadTime ? segmentLoadTime.toFixed(2) + 'ms' : 'N/A');
                        } else {
                            console.log('Missing performanceTracker or data.frag:', {
                                hasPerformanceTracker: !!performanceTracker,
                                hasFrag: !!data.frag
                            });
                        }
                    } catch (fragError) {
                        console.warn('Error in fragment loaded handler:', fragError);
                    }
                });

                // Buffer stall events for rebuffering tracking
                hlsPlayer.on(Hls.Events.BUFFER_EMPTY, function (event, data) {
                    try {
                        console.log('Buffer empty detected - rebuffering started');
                        if (performanceTracker) {
                            performanceTracker.onBufferStall();
                        }
                    } catch (error) {
                        console.error('Error in buffer empty handler:', error);
                    }
                });

                // Buffer append events for rebuffering resume
                hlsPlayer.on(Hls.Events.BUFFER_APPENDED, function (event, data) {
                    try {
                        // Only trigger resume if we were actually rebuffering
                        if (performanceTracker && performanceTracker.isRebufferingActive) {
                            console.log('Buffer appended - rebuffering may resume');
                            // Use a small delay to ensure buffer has enough data
                            setTimeout(() => {
                                if (videoElement && !videoElement.paused && videoElement.readyState >= 3) {
                                    console.log('Buffer resumed - rebuffering ended');
                                    performanceTracker.onBufferResume();
                                }
                            }, 100);
                        }
                    } catch (error) {
                        console.error('Error in buffer appended handler:', error);
                    }
                });

                // Additional buffer events for more accurate rebuffering detection
                hlsPlayer.on(Hls.Events.BUFFER_FLUSHED, function (event, data) {
                    try {
                        console.log('Buffer flushed - potential rebuffering event');
                        if (performanceTracker && videoElement && !videoElement.paused) {
                            performanceTracker.onBufferStall();
                        }
                    } catch (error) {
                        console.error('Error in buffer flushed handler:', error);
                    }
                });

                // Add additional event listeners for better error handling
                hlsPlayer.on(Hls.Events.MEDIA_DETACHED, function () {
                    console.log('Media detached from HLS.js');
                });

                hlsPlayer.on(Hls.Events.DESTROYING, function () {
                    console.log('HLS.js instance being destroyed');
                });

                // Load the stream
                hlsPlayer.loadSource(url);
                hlsPlayer.attachMedia(videoElement);

            } catch (hlsError) {
                clearTimeout(loadTimeout);
                console.error('Error creating HLS instance:', hlsError);
                showError('Failed to initialize HLS player. Please try refreshing the page.');
                showLoading(false);
                updateConnectionStatus('error');
                return;
            }

        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            try {
                videoElement.src = url;

                // Initialize StreamAnalytics for native HLS
                try {
                    if (streamAnalytics) {
                        streamAnalytics.stopMonitoring();
                    }
                    setAppState('streamAnalytics', new StreamAnalytics(null, videoElement));
                } catch (analyticsError) {
                    console.warn('Failed to initialize stream analytics for native HLS:', analyticsError);
                }

                const loadedMetadataHandler = function () {
                    try {
                        clearTimeout(loadTimeout);
                        updateLoadingProgress(75, 'Stream metadata loaded...');
                        console.log('Stream loaded with native HLS support');

                        setTimeout(() => {
                            showLoading(false);
                            updateConnectionStatus('streaming');
                        }, 500);

                        // Start stream analytics monitoring
                        if (streamAnalytics) {
                            try {
                                streamAnalytics.startMonitoring();
                                streamAnalytics.metrics.stream.url = url;
                            } catch (analyticsError) {
                                console.warn('Failed to start stream analytics:', analyticsError);
                            }
                        }

                        // Detect live stream for native HLS
                        detectLiveStreamNative();

                        // Start periodic live status checking for native HLS
                        startLiveStatusMonitoring();

                        // Update dashboard for stream start
                        updateDashboardForStream();

                        videoElement.removeEventListener('loadedmetadata', loadedMetadataHandler);
                    } catch (metadataError) {
                        console.error('Error processing loaded metadata:', metadataError);
                        showError('Failed to process stream metadata.');
                        showLoading(false);
                        updateConnectionStatus('error');
                    }
                };

                videoElement.addEventListener('loadedmetadata', loadedMetadataHandler);

                videoElement.addEventListener('error', function (e) {
                    clearTimeout(loadTimeout);
                    handleNativeVideoError(e);
                });

                // Auto-play the stream with better error handling
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('Native HLS stream started playing successfully');
                        showGlobalMessage('Stream loaded successfully', 'success');
                    }).catch(function (error) {
                        console.log('Auto-play prevented:', error);
                        showError('Auto-play was prevented. Please click the play button to start the stream.');
                    });
                }

            } catch (nativeError) {
                clearTimeout(loadTimeout);
                console.error('Error with native HLS:', nativeError);
                showError('Failed to load stream with native HLS support.');
                showLoading(false);
                updateConnectionStatus('error');
            }
        } else {
            clearTimeout(loadTimeout);
            showError('HLS playback is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
            showLoading(false);
            updateConnectionStatus('error');
        }

    } catch (error) {
        clearTimeout(loadTimeout);
        console.error('Error loading stream:', error);
        showError('Failed to load stream: ' + (error.message || 'Unknown error occurred'));
        showLoading(false);
        updateConnectionStatus('error');
        resetStreamState();
    }
}

/**
 * Handle HLS.js errors with comprehensive error recovery
 */
function handleHLSError(event, data) {
    try {
        console.error('HLS Error:', data);

        let errorMessage = 'Stream playback error';
        let canRecover = false;
        let recoveryAction = null;

        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                switch (data.details) {
                    case Hls.ErrorDetails.MANIFEST_LOAD_ERROR:
                        errorMessage = 'Failed to load stream manifest. Please check the URL and your internet connection.';
                        break;
                    case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
                        errorMessage = 'Stream manifest loading timed out. Please check your connection and try again.';
                        break;
                    case Hls.ErrorDetails.FRAG_LOAD_ERROR:
                        errorMessage = 'Failed to load video segments. Connection may be unstable.';
                        canRecover = true;
                        recoveryAction = () => hlsPlayer && hlsPlayer.startLoad();
                        break;
                    case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
                        errorMessage = 'Video segment loading timed out. Attempting to recover...';
                        canRecover = true;
                        recoveryAction = () => hlsPlayer && hlsPlayer.startLoad();
                        break;
                    default:
                        errorMessage = 'Network error: Unable to load the stream. Please check your connection and the stream URL.';
                }
                break;

            case Hls.ErrorTypes.MEDIA_ERROR:
                switch (data.details) {
                    case Hls.ErrorDetails.BUFFER_STALLED_ERROR:
                        errorMessage = 'Video buffer stalled. Attempting to recover...';
                        canRecover = true;
                        recoveryAction = () => hlsPlayer && hlsPlayer.recoverMediaError();
                        break;
                    case Hls.ErrorDetails.BUFFER_FULL_ERROR:
                        errorMessage = 'Video buffer is full. Attempting to recover...';
                        canRecover = true;
                        recoveryAction = () => hlsPlayer && hlsPlayer.recoverMediaError();
                        break;
                    default:
                        errorMessage = 'Media error: There was a problem with the video format or codec.';
                        canRecover = true;
                        recoveryAction = () => hlsPlayer && hlsPlayer.recoverMediaError();
                }
                break;

            case Hls.ErrorTypes.MUX_ERROR:
                errorMessage = 'Stream format error: The video stream format is not supported or corrupted.';
                break;

            case Hls.ErrorTypes.OTHER_ERROR:
                errorMessage = 'Unknown error occurred during playback. Please try refreshing the page.';
                break;

            default:
                errorMessage = 'Unexpected error occurred during stream playback.';
        }

        // Update error statistics if analytics is available
        if (streamAnalytics && streamAnalytics.metrics) {
            try {
                streamAnalytics.metrics.performance.errors++;

                // Categorize errors
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        streamAnalytics.metrics.performance.errorCategories.network++;
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        streamAnalytics.metrics.performance.errorCategories.media++;
                        break;
                    case Hls.ErrorTypes.MUX_ERROR:
                        streamAnalytics.metrics.performance.errorCategories.mux++;
                        break;
                    default:
                        streamAnalytics.metrics.performance.errorCategories.other++;
                }
            } catch (analyticsError) {
                console.warn('Failed to update error analytics:', analyticsError);
            }
        }

        if (data.fatal) {
            // Fatal error - show error and reset
            showError(errorMessage);
            showLoading(false);
            updateConnectionStatus('error');
            resetStreamState();
            showGlobalError('Stream playback failed. Please try a different stream or refresh the page.');
        } else {
            // Non-fatal error - try to recover
            console.warn('Non-fatal HLS error:', errorMessage);

            if (canRecover && recoveryAction) {
                try {
                    showGlobalMessage('Attempting to recover from playback error...', 'warning', 3000);
                    recoveryAction();
                } catch (recoveryError) {
                    console.error('Recovery attempt failed:', recoveryError);
                    showError('Failed to recover from playback error: ' + errorMessage);
                }
            } else {
                showGlobalMessage(errorMessage, 'warning', 5000);
            }
        }

    } catch (error) {
        console.error('Error in HLS error handler:', error);
        showGlobalError('Critical error in stream playback. Please refresh the page.');
        resetStreamState();
    }
}

/**
 * Handle native video element errors with detailed error reporting
 */
function handleNativeVideoError(event) {
    try {
        const error = event.target.error;
        let errorMessage = 'Video playback error';
        let userFriendlyMessage = '';
        let canRetry = false;

        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Video playback was aborted by the user or browser';
                    userFriendlyMessage = 'Video playback was stopped. You can try loading the stream again.';
                    canRetry = true;
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error: Unable to load the stream';
                    userFriendlyMessage = 'Network error occurred while loading the stream. Please check your internet connection and try again.';
                    canRetry = true;
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMessage = 'Video decode error: The stream format may not be supported';
                    userFriendlyMessage = 'The video format cannot be decoded by your browser. The stream may be corrupted or use an unsupported codec.';
                    canRetry = false;
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Stream format not supported by this browser';
                    userFriendlyMessage = 'This stream format is not supported by your browser. Please try using a different browser or stream.';
                    canRetry = false;
                    break;
                default:
                    errorMessage = `Unknown video playback error (code: ${error.code})`;
                    userFriendlyMessage = 'An unknown error occurred during video playback. Please try refreshing the page.';
                    canRetry = true;
            }

            // Log additional error details if available
            if (error.message) {
                console.error('Native video error details:', error.message);
            }
        } else {
            errorMessage = 'Video element error without error object';
            userFriendlyMessage = 'An unexpected error occurred with the video player. Please try refreshing the page.';
            canRetry = true;
        }

        // Update error statistics if analytics is available
        if (streamAnalytics && streamAnalytics.metrics) {
            try {
                streamAnalytics.metrics.performance.errors++;
                streamAnalytics.metrics.performance.errorCategories.media++;
            } catch (analyticsError) {
                console.warn('Failed to update native video error analytics:', analyticsError);
            }
        }

        console.error('Native video error:', errorMessage);
        showError(userFriendlyMessage);
        showLoading(false);
        updateConnectionStatus('error');
        resetStreamState();

        // Show retry option for recoverable errors
        if (canRetry) {
            showGlobalMessage('You can try loading the stream again or use a different URL.', 'info', 8000);
        } else {
            showGlobalError('This stream cannot be played in your current browser. Please try a different stream or browser.');
        }

    } catch (error) {
        console.error('Error in native video error handler:', error);
        showGlobalError('Critical error in video playback. Please refresh the page.');
        resetStreamState();
    }
}

/**
 * Show error message with enhanced styling
 */
function showError(message) {
    try {
        const errorElement = document.getElementById('urlError');
        if (errorElement) {
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            errorElement.style.display = 'flex';
            errorElement.classList.add('show');

            // Add animation class for better UX
            errorElement.classList.remove('error-fade-in');
            setTimeout(() => {
                errorElement.classList.add('error-fade-in');
            }, 10);

            // Auto-hide error after 10 seconds
            setTimeout(() => {
                clearError();
            }, 10000);
        }
        console.error('Error:', message);
    } catch (error) {
        console.error('Failed to show error message:', error);
        // Fallback to alert if DOM manipulation fails
        alert('Error: ' + message);
    }
}

/**
 * Show global error message
 */
function showGlobalError(message, duration = 8000) {
    try {
        showGlobalMessage(message, 'error', duration);
    } catch (error) {
        console.error('Failed to show global error:', error);
        alert('Error: ' + message);
    }
}

/**
 * Show global message with different types
 */
function showGlobalMessage(message, type = 'info', duration = 5000) {
    try {
        // Create or get global message container
        let messageContainer = document.getElementById('globalMessages');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'globalMessages';
            messageContainer.className = 'global-messages';
            document.body.appendChild(messageContainer);
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `global-message global-message--${type}`;

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        messageElement.innerHTML = `
            <i class="${iconMap[type] || iconMap.info}"></i>
            <span>${message}</span>
            <button class="global-message__close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        messageContainer.appendChild(messageElement);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (messageElement.parentElement) {
                    messageElement.remove();
                }
            }, duration);
        }

        console.log(`Global ${type}:`, message);
    } catch (error) {
        console.error('Failed to show global message:', error);
    }
}

/**
 * Show global loading indicator
 */
function showGlobalLoading(show, message = 'Loading...') {
    try {
        let loadingElement = document.getElementById('globalLoading');

        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'globalLoading';
                loadingElement.className = 'global-loading';
                document.body.appendChild(loadingElement);
            }

            loadingElement.innerHTML = `
                <div class="global-loading__backdrop"></div>
                <div class="global-loading__content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${message}</span>
                </div>
            `;
            loadingElement.style.display = 'flex';
        } else {
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to show global loading:', error);
    }
}

/**
 * Clear error message
 */
function clearError() {
    try {
        const errorElement = document.getElementById('urlError');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            errorElement.classList.remove('show', 'error-fade-in');
        }
    } catch (error) {
        console.error('Failed to clear error:', error);
    }
}

/**
 * Disable stream input when HLS is not supported
 */
function disableStreamInput() {
    try {
        const streamUrlInput = document.getElementById('streamUrl');
        const loadStreamButton = document.getElementById('loadStream');

        if (streamUrlInput) {
            streamUrlInput.disabled = true;
            streamUrlInput.placeholder = 'HLS streaming not supported in this browser';
        }

        if (loadStreamButton) {
            loadStreamButton.disabled = true;
            loadStreamButton.innerHTML = '<i class="fas fa-ban"></i> Not Supported';
        }

        showGlobalError('HLS streaming is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
    } catch (error) {
        console.error('Failed to disable stream input:', error);
    }
}

/**
 * Reset stream state on errors
 */
function resetStreamState() {
    try {
        if (hlsPlayer) {
            try {
                hlsPlayer.destroy();
            } catch (destroyError) {
                console.warn('Error destroying HLS player:', destroyError);
            }
        }
        setAppState('hlsPlayer', null);

        if (streamAnalytics) {
            try {
                streamAnalytics.stopMonitoring();
            } catch (analyticsError) {
                console.warn('Error stopping stream analytics:', analyticsError);
            }
        }
        setAppState('streamAnalytics', null);

        resetLiveStreamState();
        resetDashboardForStream();

        // Reset startup metrics
        if (performanceTracker) {
            performanceTracker.resetStartupMetrics();
            performanceTracker.resetRebufferMetrics();
            performanceTracker.resetFrameMetrics();
            performanceTracker.resetBitrateAndBufferMetrics();
        }

        if (videoElement) {
            videoElement.src = '';
            videoElement.load();
        }
    } catch (error) {
        console.error('Failed to reset stream state:', error);
    }
}

/**
 * Check for required dependencies and show warnings for missing ones
 */
function checkDependencies() {
    try {
        const dependencies = [
            { name: 'HLS.js', check: () => window.Hls, critical: true },
            { name: 'Chart.js', check: () => window.Chart, critical: false },
            { name: 'Font Awesome', check: () => document.querySelector('link[href*="font-awesome"]'), critical: false }
        ];

        const missing = [];
        const warnings = [];

        dependencies.forEach(dep => {
            try {
                if (!dep.check()) {
                    if (dep.critical) {
                        missing.push(dep.name);
                    } else {
                        warnings.push(dep.name);
                    }
                }
            } catch (checkError) {
                console.warn(`Error checking dependency ${dep.name}:`, checkError);
                if (dep.critical) {
                    missing.push(dep.name);
                } else {
                    warnings.push(dep.name);
                }
            }
        });

        if (missing.length > 0) {
            showGlobalError(`Critical dependencies missing: ${missing.join(', ')}. Please refresh the page.`);
            disableStreamInput();
        }

        if (warnings.length > 0) {
            showGlobalMessage(`Some features may be limited due to missing dependencies: ${warnings.join(', ')}`, 'warning');
        }

        // Check browser compatibility
        checkBrowserCompatibility();

    } catch (error) {
        console.error('Failed to check dependencies:', error);
        showGlobalError('Failed to verify application dependencies. Some features may not work properly.');
    }
}

/**
 * Check browser compatibility and show warnings with enhanced cross-browser support
 */
function checkBrowserCompatibility() {
    try {
        const issues = [];
        const userAgent = navigator.userAgent.toLowerCase();

        // Check for required APIs
        if (!window.fetch) {
            issues.push('Fetch API not supported');
            // Add fetch polyfill fallback
            window.fetch = window.fetch || function (url, options) {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(options?.method || 'GET', url);
                    xhr.onload = () => resolve({
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        text: () => Promise.resolve(xhr.responseText),
                        json: () => Promise.resolve(JSON.parse(xhr.responseText))
                    });
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(options?.body);
                });
            };
        }

        if (!window.Promise) {
            issues.push('Promises not supported');
        }

        if (!window.addEventListener) {
            issues.push('Event listeners not supported');
        }

        // Check for modern JavaScript features
        try {
            eval('const test = () => {};');
        } catch (e) {
            issues.push('Modern JavaScript not supported');
        }

        // Check for CSS Grid support
        if (window.CSS && !CSS.supports('display', 'grid')) {
            issues.push('CSS Grid not supported - layout may be affected');
        }

        // Add polyfills for missing features
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback) {
                return setTimeout(callback, 1000 / 60);
            };
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
        }

        // Fullscreen API normalization
        if (!document.fullscreenEnabled) {
            if (document.webkitFullscreenEnabled) {
                HTMLElement.prototype.requestFullscreen = HTMLElement.prototype.webkitRequestFullscreen;
                document.exitFullscreen = document.webkitExitFullscreen;
                Object.defineProperty(document, 'fullscreenElement', {
                    get: () => document.webkitFullscreenElement
                });
            } else if (document.mozFullScreenEnabled) {
                HTMLElement.prototype.requestFullscreen = HTMLElement.prototype.mozRequestFullScreen;
                document.exitFullscreen = document.mozCancelFullScreen;
                Object.defineProperty(document, 'fullscreenElement', {
                    get: () => document.mozFullScreenElement
                });
            }
        }

        // Performance API fallback
        if (!window.performance) {
            window.performance = {
                now: function () {
                    return Date.now();
                }
            };
        }

        // Browser-specific optimizations
        applyBrowserSpecificOptimizations(userAgent);

        if (issues.length > 0) {
            showGlobalMessage(`Browser compatibility issues detected: ${issues.join(', ')}. Consider updating your browser.`, 'warning', 10000);
        }

    } catch (error) {
        console.error('Failed to check browser compatibility:', error);
    }
}

/**
 * Apply browser-specific optimizations
 */
function applyBrowserSpecificOptimizations(userAgent) {
    try {
        // Safari-specific fixes
        if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            document.body.classList.add('browser-safari');

            // Safari has issues with some CSS properties
            const style = document.createElement('style');
            style.textContent = `
                .browser-safari .video-player {
                    -webkit-transform: translateZ(0);
                }
                .browser-safari .chart-container {
                    will-change: auto;
                }
                .browser-safari .live-indicator {
                    -webkit-backface-visibility: hidden;
                }
            `;
            document.head.appendChild(style);
        }

        // Firefox-specific fixes
        if (userAgent.includes('firefox')) {
            document.body.classList.add('browser-firefox');

            // Firefox scrollbar styling
            const style = document.createElement('style');
            style.textContent = `
                .browser-firefox * {
                    scrollbar-width: thin;
                    scrollbar-color: var(--color-primary) var(--bg-tertiary);
                }
            `;
            document.head.appendChild(style);
        }

        // Edge-specific fixes
        if (userAgent.includes('edge') || userAgent.includes('edg/')) {
            document.body.classList.add('browser-edge');
        }

        // Chrome-specific optimizations
        if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
            document.body.classList.add('browser-chrome');

            // Enable hardware acceleration for Chrome
            const style = document.createElement('style');
            style.textContent = `
                .browser-chrome .video-player,
                .browser-chrome .chart-container {
                    transform: translateZ(0);
                    will-change: transform;
                }
            `;
            document.head.appendChild(style);
        }

        // Mobile browser fixes
        if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
            document.body.classList.add('mobile-browser');

            // Disable hover effects on mobile
            const style = document.createElement('style');
            style.textContent = `
                .mobile-browser .card:hover,
                .mobile-browser .btn:hover,
                .mobile-browser .video-container:hover {
                    transform: none;
                }
                .mobile-browser .live-indicator {
                    animation-duration: 3s;
                }
            `;
            document.head.appendChild(style);

            // Add touch-friendly interactions
            document.addEventListener('touchstart', function () { }, { passive: true });
        }

        // iOS-specific fixes
        if (/iphone|ipad|ipod/i.test(userAgent)) {
            document.body.classList.add('ios-browser');

            // iOS viewport fix
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (viewportMeta) {
                viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            }

            // iOS video playback fixes
            if (videoElement) {
                videoElement.setAttribute('playsinline', '');
                videoElement.setAttribute('webkit-playsinline', '');
            }
        }

        console.log('Browser-specific optimizations applied');
    } catch (error) {
        console.error('Error applying browser-specific optimizations:', error);
    }
}

/**
 * Show/hide loading indicator with error handling
 */
function showLoading(show, message = 'Loading stream...') {
    try {
        const loadingElement = document.getElementById('loadingIndicator');
        if (loadingElement) {
            if (show) {
                loadingElement.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    ${message}
                `;
                loadingElement.style.display = 'flex';

                // Update input state to loading
                updateInputState('loading');

                // Show progress bar
                showLoadingProgress(true);
            } else {
                loadingElement.style.display = 'none';

                // Reset input state from loading
                updateInputState('default');

                // Hide progress bar
                showLoadingProgress(false);
            }
        } else {
            console.warn('Loading indicator element not found');
        }
    } catch (error) {
        console.error('Error showing/hiding loading indicator:', error);
    }
}

/**
 * Show/hide loading progress bar
 */
function showLoadingProgress(show, progress = 0) {
    try {
        const progressElement = document.getElementById('loadingProgress');
        const progressFill = document.getElementById('loadingProgressFill');

        if (progressElement) {
            if (show) {
                progressElement.style.display = 'block';
                if (progressFill) {
                    progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
                }
            } else {
                progressElement.style.display = 'none';
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
            }
        }
    } catch (error) {
        console.error('Error showing/hiding loading progress:', error);
    }
}

/**
 * Update loading progress
 */
function updateLoadingProgress(progress, message = null) {
    try {
        showLoadingProgress(true, progress);

        if (message) {
            const loadingElement = document.getElementById('loadingIndicator');
            if (loadingElement && loadingElement.style.display !== 'none') {
                loadingElement.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    ${message}
                `;
            }
        }
    } catch (error) {
        console.error('Error updating loading progress:', error);
    }
}

/**
 * Update connection status indicator with error handling
 */
function updateConnectionStatus(status, message) {
    try {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) {
            console.warn('Connection status element not found');
            return;
        }

        // Validate status parameter
        const validStatuses = ['ready', 'loading', 'streaming', 'error', 'disconnected'];
        if (!validStatuses.includes(status)) {
            console.warn(`Invalid status: ${status}, defaulting to 'ready'`);
            status = 'ready';
        }

        switch (status) {
            case 'ready':
                statusElement.innerHTML = '<i class="fas fa-circle"></i> Ready';
                statusElement.style.color = 'var(--color-success)';
                statusElement.title = 'Application is ready to load streams';
                break;
            case 'loading':
                statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (message || 'Loading...');
                statusElement.style.color = 'var(--color-warning)';
                statusElement.title = message || 'Loading stream...';
                break;
            case 'streaming':
                statusElement.innerHTML = '<i class="fas fa-play-circle"></i> Streaming';
                statusElement.style.color = 'var(--color-success)';
                statusElement.title = 'Stream is playing successfully';
                break;
            case 'error':
                statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
                statusElement.style.color = 'var(--color-error)';
                statusElement.title = message || 'An error occurred';
                break;
            case 'disconnected':
                statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Disconnected';
                statusElement.style.color = 'var(--color-error)';
                statusElement.title = 'Connection lost';
                break;
            default:
                statusElement.innerHTML = '<i class="fas fa-circle"></i> Ready';
                statusElement.style.color = 'var(--color-success)';
                statusElement.title = 'Application is ready';
        }

        // Add accessibility attributes
        statusElement.setAttribute('aria-label', statusElement.textContent);

    } catch (error) {
        console.error('Error updating connection status:', error);
        // Fallback: try to show error in console at least
        console.error(`Failed to update status to: ${status} - ${message}`);
    }
}

/**
 * Detect if the stream is live based on manifest data
 */
function detectLiveStream(data) {
    // Check if any level has live characteristics
    const hasLiveLevels = data.levels && data.levels.some(level => {
        // Check for live indicators in the level details
        return level.details && (
            level.details.live === true ||
            level.details.type === 'LIVE' ||
            level.details.endSN === undefined ||
            level.details.endSN === null
        );
    });

    // Also check the main manifest for live indicators
    const manifestIsLive = data.live === true ||
        data.type === 'LIVE' ||
        (hlsPlayer && hlsPlayer.liveSyncPosition !== undefined);

    const liveDetected = hasLiveLevels || manifestIsLive;
    setAppState('isLiveStream', liveDetected);

    console.log('Live stream detection:', {
        hasLiveLevels,
        manifestIsLive,
        isLiveStream,
        liveSyncPosition: hlsPlayer ? hlsPlayer.liveSyncPosition : 'N/A'
    });

    updateLiveIndicator();
    updateSeekingControls();
}

/**
 * Update live status based on level loaded events
 */
function updateLiveStatus(data) {
    if (data.details) {
        const wasLive = isLiveStream;

        const isCurrentlyLive = data.details.live === true ||
            data.details.type === 'LIVE' ||
            data.details.endSN === undefined ||
            data.details.endSN === null ||
            (hlsPlayer && hlsPlayer.liveSyncPosition !== undefined);

        if (wasLive !== isCurrentlyLive) {
            setAppState('isLiveStream', isCurrentlyLive);
            console.log('Live status changed:', { wasLive, isLiveStream: isCurrentlyLive });
            updateLiveIndicator();
            updateSeekingControls();
        }
    }
}

/**
 * Update the live indicator visibility and animation
 */
function updateLiveIndicator() {
    const liveIndicator = document.getElementById('liveIndicator');
    if (!liveIndicator) return;

    // Always show live indicator when there's a stream playing
    if (videoElement && !videoElement.paused && videoElement.currentTime > 0) {
        liveIndicator.style.display = 'flex';
        console.log('Live indicator shown - stream is playing');
    } else {
        liveIndicator.style.display = 'none';
        console.log('Live indicator hidden - no stream playing');
    }
}

/**
 * Update seeking controls based on live status
 */
function updateSeekingControls() {
    if (!videoElement) return;

    // Seeking is now allowed

    // Seeking is enabled
    videoElement.style.cursor = 'pointer';
    videoElement.title = 'Live stream';

    console.log('Live stream loaded - seeking enabled');
}



/**
 * Detect live stream for native HLS support (Safari)
 */
function detectLiveStreamNative() {
    if (!videoElement) return;

    // For native HLS, we need to use different methods to detect live streams
    const duration = videoElement.duration;
    const seekable = videoElement.seekable;

    // Live streams typically have infinite duration or very large duration
    const hasInfiniteDuration = !isFinite(duration) || duration === 0;

    // Check seekable range - live streams often have limited seekable range
    const hasLimitedSeekable = seekable.length > 0 &&
        (seekable.end(seekable.length - 1) - seekable.start(0)) < duration * 0.9;

    // Additional check: if the video keeps updating its duration, it's likely live
    let durationCheckCount = 0;
    const initialDuration = duration;

    const checkDurationChanges = () => {
        durationCheckCount++;
        const currentDuration = videoElement.duration;

        if (currentDuration !== initialDuration || hasInfiniteDuration) {
            setAppState('isLiveStream', true);
            console.log('Native HLS live stream detected:', {
                hasInfiniteDuration,
                hasLimitedSeekable,
                durationChanged: currentDuration !== initialDuration,
                duration: currentDuration
            });
            updateLiveIndicator();
            updateSeekingControls();
            return;
        }

        // Check a few more times over 3 seconds
        if (durationCheckCount < 6) {
            const timeoutId = setTimeout(checkDurationChanges, 500);
            memoryManager.addTimeout(timeoutId);
        } else {
            // Assume it's not live if duration hasn't changed
            setAppState('isLiveStream', hasInfiniteDuration || hasLimitedSeekable);
            console.log('Native HLS stream analysis complete:', {
                isLiveStream,
                hasInfiniteDuration,
                hasLimitedSeekable,
                finalDuration: videoElement.duration
            });
            updateLiveIndicator();
            updateSeekingControls();
        }
    };

    // Start checking after a short delay to let the video initialize
    const initialTimeout = setTimeout(checkDurationChanges, 500);
    memoryManager.addTimeout(initialTimeout);
}

/**
 * Start periodic monitoring of live status
 */
function startLiveStatusMonitoring() {
    // Clear any existing interval
    if (liveStatusCheckInterval) {
        clearInterval(liveStatusCheckInterval);
        setAppState('liveStatusCheckInterval', null);
    }

    // Check live status every 5 seconds
    const intervalId = setInterval(() => {
        if (hlsPlayer && videoElement && !videoElement.paused) {
            // For HLS.js, check if we have live sync position
            const liveSyncPosition = hlsPlayer.liveSyncPosition;
            const wasLive = isLiveStream;
            const isCurrentlyLive = liveSyncPosition !== undefined && liveSyncPosition !== null;

            if (wasLive !== isCurrentlyLive) {
                setAppState('isLiveStream', isCurrentlyLive);
                console.log('Periodic live status check - status changed:', { wasLive, isLiveStream: isCurrentlyLive });
                updateLiveIndicator();
                updateSeekingControls();
            }
        } else if (videoElement && !videoElement.paused) {
            // For native HLS, check duration and seekable range
            const duration = videoElement.duration;
            const wasLive = isLiveStream;

            const isCurrentlyLive = !isFinite(duration) || duration === 0;

            if (wasLive !== isCurrentlyLive) {
                setAppState('isLiveStream', isCurrentlyLive);
                console.log('Periodic native HLS live status check - status changed:', { wasLive, isLiveStream: isCurrentlyLive });
                updateLiveIndicator();
                updateSeekingControls();
            }
        }
    }, 5000);

    setAppState('liveStatusCheckInterval', intervalId);
    memoryManager.addInterval(intervalId);
}

/**
 * Stop live status monitoring
 */
function stopLiveStatusMonitoring() {
    if (liveStatusCheckInterval) {
        clearInterval(liveStatusCheckInterval);
        setAppState('liveStatusCheckInterval', null);
    }
}

/**
 * Reset live stream state
 */
function resetLiveStreamState() {
    setAppState('isLiveStream', false);
    stopLiveStatusMonitoring();
    updateLiveIndicator();
    updateSeekingControls();
}

/**
 * StreamAnalytics Class - Monitors stream performance and playback quality metrics
 */
class StreamAnalytics {
    constructor(hlsPlayer, videoElement) {
        this.hlsPlayer = hlsPlayer;
        this.videoElement = videoElement;
        this.isMonitoring = false;
        this.startTime = null;
        this.loadStartTime = null;
        this.firstFrameTime = null;

        this.metrics = {
            stream: {
                url: null,
                isLive: false,
                currentBitrate: 0,
                resolution: null,
                frameRate: 0,
                codec: null,
                loadTime: 0,
                bufferingDuration: 0
            },
            performance: {
                droppedFrames: 0,
                errors: 0,
                latency: 0,
                stallCount: 0,
                rebufferTime: 0,
                bufferUnderruns: 0,
                errorCategories: {
                    network: 0,
                    media: 0,
                    mux: 0,
                    other: 0,
                    buffer: 0
                }
            },
            quality: {
                availableLevels: [],
                currentLevel: -1,
                autoLevelEnabled: true,
                levelSwitches: 0
            }
        };

        this.eventHandlers = {
            manifestParsed: this.onManifestParsed.bind(this),
            levelLoaded: this.onLevelLoaded.bind(this),
            levelSwitched: this.onLevelSwitched.bind(this),
            fragLoaded: this.onFragLoaded.bind(this),
            error: this.onError.bind(this),
            bufferAppended: this.onBufferAppended.bind(this)
        };

        console.log('StreamAnalytics initialized');
    }

    /**
     * Start monitoring stream performance
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.warn('StreamAnalytics already monitoring');
            return;
        }

        this.isMonitoring = true;
        this.startTime = performance.now();
        this.loadStartTime = performance.now();

        // Set up HLS.js event listeners
        if (this.hlsPlayer) {
            this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, this.eventHandlers.manifestParsed);
            this.hlsPlayer.on(Hls.Events.LEVEL_LOADED, this.eventHandlers.levelLoaded);
            this.hlsPlayer.on(Hls.Events.LEVEL_SWITCHED, this.eventHandlers.levelSwitched);
            this.hlsPlayer.on(Hls.Events.FRAG_LOADED, this.eventHandlers.fragLoaded);
            this.hlsPlayer.on(Hls.Events.ERROR, this.eventHandlers.error);
            this.hlsPlayer.on(Hls.Events.BUFFER_APPENDED, this.eventHandlers.bufferAppended);
        }

        // Set up video element event listeners
        if (this.videoElement) {
            this.videoElement.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
            this.videoElement.addEventListener('canplay', this.onCanPlay.bind(this));
            this.videoElement.addEventListener('waiting', this.onWaiting.bind(this));
            this.videoElement.addEventListener('playing', this.onPlaying.bind(this));
            this.videoElement.addEventListener('stalled', this.onStalled.bind(this));
        }

        // Start periodic metrics collection
        this.metricsInterval = setInterval(() => {
            this.collectCurrentMetrics();
        }, 1000);

        console.log('StreamAnalytics monitoring started');
    }

    /**
     * Stop monitoring stream performance
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        // Remove HLS.js event listeners
        if (this.hlsPlayer) {
            this.hlsPlayer.off(Hls.Events.MANIFEST_PARSED, this.eventHandlers.manifestParsed);
            this.hlsPlayer.off(Hls.Events.LEVEL_LOADED, this.eventHandlers.levelLoaded);
            this.hlsPlayer.off(Hls.Events.LEVEL_SWITCHED, this.eventHandlers.levelSwitched);
            this.hlsPlayer.off(Hls.Events.FRAG_LOADED, this.eventHandlers.fragLoaded);
            this.hlsPlayer.off(Hls.Events.ERROR, this.eventHandlers.error);
            this.hlsPlayer.off(Hls.Events.BUFFER_APPENDED, this.eventHandlers.bufferAppended);
        }

        // Remove video element event listeners
        if (this.videoElement) {
            this.videoElement.removeEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
            this.videoElement.removeEventListener('canplay', this.onCanPlay.bind(this));
            this.videoElement.removeEventListener('waiting', this.onWaiting.bind(this));
            this.videoElement.removeEventListener('playing', this.onPlaying.bind(this));
            this.videoElement.removeEventListener('stalled', this.onStalled.bind(this));
        }

        // Clear intervals
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }

        console.log('StreamAnalytics monitoring stopped');
    }

    /**
     * Handle manifest parsed event
     */
    onManifestParsed(event, data) {
        // Store levels from HLS player directly
        if (this.hlsPlayer && this.hlsPlayer.levels) {
            this.metrics.quality.availableLevels = this.hlsPlayer.levels.map(level => ({
                bitrate: level.bitrate || 0,
                width: level.width || 0,
                height: level.height || 0,
                codecs: level.codecs || '',
                frameRate: level.frameRate || 0
            }));
        } else {
            // Fallback to data.levels
            this.metrics.quality.availableLevels = data.levels.map(level => ({
                bitrate: level.bitrate || 0,
                width: level.width || 0,
                height: level.height || 0,
                codecs: level.codecs || '',
                frameRate: level.frameRate || 0
            }));
        }

        // Set initial stream info from first level
        if (this.metrics.quality.availableLevels.length > 0) {
            const firstLevel = this.metrics.quality.availableLevels[0];
            this.metrics.stream.currentBitrate = firstLevel.bitrate;
            this.metrics.stream.resolution = `${firstLevel.width}x${firstLevel.height}`;
            this.metrics.stream.frameRate = firstLevel.frameRate;
            this.metrics.stream.codec = firstLevel.codecs;
        }

        // Detect if stream is live
        this.metrics.stream.isLive = data.levels.some(level =>
            level.details && (level.details.live === true || level.details.type === 'LIVE')
        );

        console.log('StreamAnalytics: Manifest parsed', {
            levels: this.metrics.quality.availableLevels.length,
            isLive: this.metrics.stream.isLive,
            firstLevel: this.metrics.quality.availableLevels[0],
            hlsLevels: this.hlsPlayer ? this.hlsPlayer.levels.length : 0
        });
    }

    /**
     * Handle level loaded event
     */
    onLevelLoaded(event, data) {
        if (data.details) {
            // Update live status
            this.metrics.stream.isLive = data.details.live === true ||
                data.details.type === 'LIVE' ||
                data.details.endSN === undefined;
        }
    }

    /**
     * Handle level switched event
     */
    onLevelSwitched(event, data) {
        this.metrics.quality.currentLevel = data.level;
        this.metrics.quality.levelSwitches++;

        // Get current level from HLS player directly
        if (this.hlsPlayer && data.level >= 0) {
            const currentLevel = this.hlsPlayer.levels[data.level];

            if (currentLevel) {
                this.metrics.stream.currentBitrate = currentLevel.bitrate || 0;
                this.metrics.stream.resolution = `${currentLevel.width || 0}x${currentLevel.height || 0}`;
                this.metrics.stream.frameRate = currentLevel.frameRate || 0;
                this.metrics.stream.codec = currentLevel.codecs || '';

                console.log('StreamAnalytics: Level data from HLS player', {
                    level: data.level,
                    hlsLevel: currentLevel,
                    bitrate: currentLevel.bitrate,
                    resolution: `${currentLevel.width}x${currentLevel.height}`
                });
            } else {
                console.warn('StreamAnalytics: No level data available from HLS player');
            }
        }

        console.log('StreamAnalytics: Level switched', {
            level: data.level,
            bitrate: this.metrics.stream.currentBitrate,
            resolution: this.metrics.stream.resolution
        });

        // Update UI immediately when level switches
        this.updateUI();
    }

    /**
     * Handle fragment loaded event
     */
    onFragLoaded(event, data) {
        // Track loading performance
        if (data.stats) {
            const loadTime = data.stats.total;
            // Update average load time (simple moving average)
            if (this.metrics.stream.loadTime === 0) {
                this.metrics.stream.loadTime = loadTime;
            } else {
                this.metrics.stream.loadTime = (this.metrics.stream.loadTime * 0.9) + (loadTime * 0.1);
            }
        }
    }

    /**
     * Handle buffer appended event
     */
    onBufferAppended(event, data) {

    }

    /**
     * Handle error events
     */
    onError(event, data) {
        this.metrics.performance.errors++;

        // Initialize error categories if not exists
        if (!this.metrics.performance.errorCategories) {
            this.metrics.performance.errorCategories = {
                network: 0,
                media: 0,
                mux: 0,
                other: 0,
                buffer: 0
            };
        }

        // Categorize errors
        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                this.metrics.performance.errorCategories.network++;
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                this.metrics.performance.errorCategories.media++;
                break;
            case Hls.ErrorTypes.MUX_ERROR:
                this.metrics.performance.errorCategories.mux++;
                break;
            default:
                this.metrics.performance.errorCategories.other++;
        }

        // Track buffer-related errors specifically
        if (data.details && (
            data.details.includes('BUFFER') ||
            data.details.includes('STALL') ||
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
        )) {
            this.metrics.performance.errorCategories.buffer++;
        }

        console.log('StreamAnalytics: Error tracked', {
            type: data.type,
            details: data.details,
            totalErrors: this.metrics.performance.errors,
            categories: this.metrics.performance.errorCategories
        });


    }

    /**
     * Handle video metadata loaded
     */
    onLoadedMetadata() {
        if (this.loadStartTime) {
            this.metrics.stream.loadTime = performance.now() - this.loadStartTime;

            // Get video dimensions from video element
            if (this.videoElement && this.videoElement.videoWidth && this.videoElement.videoHeight) {
                this.metrics.stream.resolution = `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`;

                // Try to get bitrate from current level if available
                if (this.hlsPlayer && this.hlsPlayer.currentLevel >= 0) {
                    const currentLevel = this.hlsPlayer.levels[this.hlsPlayer.currentLevel];
                    if (currentLevel && currentLevel.bitrate) {
                        this.metrics.stream.currentBitrate = currentLevel.bitrate;
                        this.metrics.stream.frameRate = currentLevel.frameRate || 0;
                    }
                }
            }

            console.log('StreamAnalytics: Metadata loaded', {
                loadTime: this.metrics.stream.loadTime,
                resolution: this.metrics.stream.resolution,
                bitrate: this.metrics.stream.currentBitrate,
                videoWidth: this.videoElement ? this.videoElement.videoWidth : 'N/A',
                videoHeight: this.videoElement ? this.videoElement.videoHeight : 'N/A'
            });

            // Update UI with load time
            this.updateUI();
        }
    }

    /**
     * Handle video can play event
     */
    onCanPlay() {
        if (this.loadStartTime && !this.firstFrameTime) {
            this.firstFrameTime = performance.now();
            this.metrics.stream.bufferingDuration = this.firstFrameTime - this.loadStartTime;
            console.log('StreamAnalytics: First frame ready', {
                bufferingDuration: this.metrics.stream.bufferingDuration
            });
        }
    }

    /**
     * Handle video waiting event (buffering)
     */
    onWaiting() {
        this.metrics.performance.stallCount++;
        this.stallStartTime = performance.now();

        // Track buffer underrun
        this.trackBufferUnderrun();

        console.log('StreamAnalytics: Buffering started', {
            stallCount: this.metrics.performance.stallCount
        });


    }

    /**
     * Handle video playing event (after buffering)
     */
    onPlaying() {
        if (this.stallStartTime) {
            const stallDuration = performance.now() - this.stallStartTime;
            this.metrics.performance.rebufferTime += stallDuration;
            this.stallStartTime = null;
            console.log('StreamAnalytics: Buffering ended', {
                stallDuration,
                totalRebufferTime: this.metrics.performance.rebufferTime
            });


        }
    }

    /**
     * Handle video stalled event
     */
    onStalled() {
        this.metrics.performance.stallCount++;
        console.log('StreamAnalytics: Stream stalled', {
            stallCount: this.metrics.performance.stallCount
        });
    }

    /**
     * Collect current stream metrics
     */
    collectCurrentMetrics() {
        if (!this.videoElement || !this.isMonitoring) {
            return;
        }



        // Calculate latency for live streams
        if (this.metrics.stream.isLive && this.hlsPlayer) {
            const liveSyncPosition = this.hlsPlayer.liveSyncPosition;
            if (liveSyncPosition !== undefined && liveSyncPosition !== null) {
                this.metrics.performance.latency = Math.max(0, liveSyncPosition - this.videoElement.currentTime);
            }
        }

        // Get dropped frames (if available)
        if (this.videoElement.getVideoPlaybackQuality) {
            const quality = this.videoElement.getVideoPlaybackQuality();
            this.metrics.performance.droppedFrames = quality.droppedVideoFrames || 0;
        }

        // Update auto level status
        if (this.hlsPlayer) {
            this.metrics.quality.autoLevelEnabled = this.hlsPlayer.autoLevelEnabled;
        }

        // Update UI with current metrics
        this.updateUI();
    }



    /**
     * Track buffer underrun events
     */
    trackBufferUnderrun() {
        // Initialize buffer underrun tracking if not exists
        if (!this.metrics.performance.bufferUnderruns) {
            this.metrics.performance.bufferUnderruns = 0;
        }


    }

    /**
     * Get current stream metrics
     */
    getStreamMetrics() {
        // Try to get real-time data from video element if stream data is missing
        if (this.videoElement && (!this.metrics.stream.currentBitrate || !this.metrics.stream.resolution)) {
            // Get video dimensions from video element
            if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
                this.metrics.stream.resolution = `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`;
            }

            // Try to get bitrate from current level
            if (this.hlsPlayer && this.hlsPlayer.currentLevel >= 0) {
                const currentLevel = this.hlsPlayer.levels[this.hlsPlayer.currentLevel];
                if (currentLevel && currentLevel.bitrate) {
                    this.metrics.stream.currentBitrate = currentLevel.bitrate;
                    this.metrics.stream.resolution = `${currentLevel.width || this.videoElement.videoWidth}x${currentLevel.height || this.videoElement.videoHeight}`;
                    this.metrics.stream.frameRate = currentLevel.frameRate || 0;
                }
            }
        }

        const metrics = {
            ...this.metrics.stream
        };
        // console.log('getStreamMetrics returning:', metrics);
        return metrics;
    }

    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.metrics.performance
        };
    }

    /**
     * Get all analytics data
     */
    getAllMetrics() {
        return {
            stream: { ...this.metrics.stream },
            performance: { ...this.metrics.performance },
            quality: { ...this.metrics.quality }
        };
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.startTime = performance.now();
        this.loadStartTime = performance.now();
        this.firstFrameTime = null;
        this.stallStartTime = null;

        this.metrics = {
            stream: {
                url: null,
                isLive: false,
                currentBitrate: 0,
                resolution: null,
                frameRate: 0,
                codec: null,
                loadTime: 0,
                bufferingDuration: 0
            },
            performance: {
                droppedFrames: 0,
                errors: 0,
                latency: 0,
                stallCount: 0,
                rebufferTime: 0,
                bufferUnderruns: 0,
                errorCategories: {
                    network: 0,
                    media: 0,
                    mux: 0,
                    other: 0,
                    buffer: 0
                }
            },
            quality: {
                availableLevels: [],
                currentLevel: -1,
                autoLevelEnabled: true,
                levelSwitches: 0
            }
        };

        console.log('StreamAnalytics: Metrics reset');
    }

    /**
     * Update the UI with current stream metrics
     */
    updateUI() {
        // Stream Performance card removed - UI updates now handled by Overview panel
        console.log('StreamAnalytics updateUI - Stream Performance card removed');
    }


}

/**
 * UserAnalytics Class - Collects browser and system information
 */
class UserAnalytics {
    constructor() {
        this.data = {
            browser: {},
            system: {},
            network: {}
        };
        this.collectAllData();
    }

    /**
     * Collect all user analytics data
     */
    collectAllData() {
        this.collectBrowserInfo();
        this.collectSystemInfo();
        this.collectNetworkInfo();
    }

    /**
     * Collect browser information including name, version, and user agent
     */
    collectBrowserInfo() {
        const userAgent = navigator.userAgent;
        const browserInfo = this.parseBrowserInfo(userAgent);

        this.data.browser = {
            name: browserInfo.name,
            version: browserInfo.version,
            userAgent: userAgent,
            language: navigator.language || navigator.userLanguage || 'unknown',
            languages: navigator.languages || [navigator.language || 'unknown'],
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            doNotTrack: navigator.doNotTrack || 'unknown'
        };

        console.log('Browser info collected:', this.data.browser);
    }

    /**
     * Parse browser name and version from user agent string
     */
    parseBrowserInfo(userAgent) {
        const browsers = [
            { name: 'Chrome', regex: /Chrome\/(\d+\.\d+)/ },
            { name: 'Firefox', regex: /Firefox\/(\d+\.\d+)/ },
            { name: 'Safari', regex: /Version\/(\d+\.\d+).*Safari/ },
            { name: 'Edge', regex: /Edg\/(\d+\.\d+)/ },
            { name: 'Opera', regex: /OPR\/(\d+\.\d+)/ },
            { name: 'Internet Explorer', regex: /MSIE (\d+\.\d+)/ },
            { name: 'Internet Explorer', regex: /Trident.*rv:(\d+\.\d+)/ }
        ];

        for (const browser of browsers) {
            const match = userAgent.match(browser.regex);
            if (match) {
                return {
                    name: browser.name,
                    version: match[1]
                };
            }
        }

        return {
            name: 'Unknown',
            version: 'Unknown'
        };
    }

    /**
     * Collect operating system and device information
     */
    collectSystemInfo() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        this.data.system = {
            os: this.parseOperatingSystem(userAgent, platform),
            platform: platform,
            screenResolution: `${screen.width}x${screen.height}`,
            availableScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
            devicePixelRatio: window.devicePixelRatio || 1,
            colorDepth: screen.colorDepth || 'unknown',
            pixelDepth: screen.pixelDepth || 'unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
            timezoneOffset: new Date().getTimezoneOffset(),
            touchSupport: this.detectTouchSupport(),
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0
        };

        console.log('System info collected:', this.data.system);
    }

    /**
     * Parse operating system from user agent and platform
     */
    parseOperatingSystem(userAgent, platform) {
        const osPatterns = [
            { name: 'Windows 11', regex: /Windows NT 10\.0.*Win64.*x64/ },
            { name: 'Windows 10', regex: /Windows NT 10\.0/ },
            { name: 'Windows 8.1', regex: /Windows NT 6\.3/ },
            { name: 'Windows 8', regex: /Windows NT 6\.2/ },
            { name: 'Windows 7', regex: /Windows NT 6\.1/ },
            { name: 'Windows Vista', regex: /Windows NT 6\.0/ },
            { name: 'Windows XP', regex: /Windows NT 5\.1/ },
            { name: 'macOS', regex: /Mac OS X|macOS/ },
            { name: 'iOS', regex: /iPhone|iPad|iPod/ },
            { name: 'Android', regex: /Android/ },
            { name: 'Linux', regex: /Linux/ },
            { name: 'Chrome OS', regex: /CrOS/ },
            { name: 'Unix', regex: /X11/ }
        ];

        for (const os of osPatterns) {
            if (os.regex.test(userAgent)) {
                return os.name;
            }
        }

        // Fallback to platform if no match found
        if (platform) {
            if (platform.includes('Win')) return 'Windows';
            if (platform.includes('Mac')) return 'macOS';
            if (platform.includes('Linux')) return 'Linux';
            if (platform.includes('iPhone') || platform.includes('iPad')) return 'iOS';
        }

        return 'Unknown';
    }

    /**
     * Detect touch support capabilities
     */
    detectTouchSupport() {
        return {
            supported: 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,
            maxTouchPoints: navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0
        };
    }

    /**
     * Collect network information using Navigator.connection API with fallbacks
     */
    collectNetworkInfo() {
        // Initialize with default values
        this.data.network = {
            connectionType: 'unknown',
            effectiveType: 'unknown',
            downlink: null,
            rtt: null,
            saveData: false,
            supported: false
        };

        // Check if Network Information API is supported
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (connection) {
            this.data.network = {
                connectionType: connection.type || 'unknown',
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink || null,
                rtt: connection.rtt || null,
                saveData: connection.saveData || false,
                supported: true
            };

            // Add event listener for connection changes
            connection.addEventListener('change', () => {
                this.updateNetworkInfo();
            });
        } else {
            // Fallback: estimate connection type based on user agent
            this.data.network.connectionType = this.estimateConnectionType();
        }

        // Estimate bandwidth using performance timing (fallback method)
        this.estimateBandwidth();

        // Collect advanced network information
        this.collectAdvancedNetworkInfo();

        console.log('Network info collected:', this.data.network);
    }

    /**
     * Estimate connection type based on user agent (fallback method)
     */
    estimateConnectionType() {
        const userAgent = navigator.userAgent;

        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
            return 'cellular';
        }

        return 'wifi'; // Default assumption for desktop
    }

    /**
     * Estimate bandwidth using multiple performance timing methods
     */
    estimateBandwidth() {
        // Method 1: Navigation timing
        this.estimateBandwidthFromNavigation();

        // Method 2: Resource timing
        this.estimateBandwidthFromResources();

        // Method 3: Dynamic bandwidth test (if needed)
        this.performDynamicBandwidthTest();
    }

    /**
     * Estimate bandwidth from navigation timing
     */
    estimateBandwidthFromNavigation() {
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation && navigation.responseEnd && navigation.requestStart) {
                const duration = navigation.responseEnd - navigation.requestStart;
                const bytes = navigation.transferSize || 0;

                if (duration > 0 && bytes > 0) {
                    // Calculate bandwidth in Mbps
                    const bandwidth = (bytes * 8) / (duration * 1000); // Convert to Mbps
                    this.data.network.estimatedBandwidth = Math.round(bandwidth * 100) / 100;
                    this.data.network.bandwidthMethod = 'navigation-timing';

                    console.log('Bandwidth estimated from navigation timing:', this.data.network.estimatedBandwidth, 'Mbps');
                }
            }
        } catch (error) {
            console.warn('Could not estimate bandwidth from navigation timing:', error);
        }
    }

    /**
     * Estimate bandwidth from resource timing
     */
    estimateBandwidthFromResources() {
        try {
            const resources = performance.getEntriesByType('resource');
            if (resources.length > 0) {
                let totalBytes = 0;
                let totalDuration = 0;
                let resourceCount = 0;

                resources.forEach(resource => {
                    if (resource.transferSize && resource.responseEnd && resource.requestStart) {
                        const duration = resource.responseEnd - resource.requestStart;
                        if (duration > 0) {
                            totalBytes += resource.transferSize;
                            totalDuration += duration;
                            resourceCount++;
                        }
                    }
                });

                if (resourceCount > 0 && totalDuration > 0) {
                    const avgBandwidth = (totalBytes * 8) / (totalDuration * 1000); // Convert to Mbps

                    // Only update if we don't have a bandwidth estimate or this one seems more reliable
                    if (!this.data.network.estimatedBandwidth || resourceCount >= 3) {
                        this.data.network.estimatedBandwidth = Math.round(avgBandwidth * 100) / 100;
                        this.data.network.bandwidthMethod = 'resource-timing';
                        this.data.network.resourceCount = resourceCount;

                        console.log('Bandwidth estimated from resource timing:', this.data.network.estimatedBandwidth, 'Mbps', `(${resourceCount} resources)`);
                    }
                }
            }
        } catch (error) {
            console.warn('Could not estimate bandwidth from resource timing:', error);
        }
    }

    /**
     * Perform dynamic bandwidth test using a small image download
     */
    performDynamicBandwidthTest() {
        // Only perform if we don't have a reliable estimate
        if (this.data.network.estimatedBandwidth && this.data.network.estimatedBandwidth > 0) {
            return;
        }

        try {
            const testImageUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent GIF
            const startTime = performance.now();

            const img = new Image();
            img.onload = () => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                // This is a very small image, so we'll use it as a latency test instead
                this.data.network.estimatedLatency = Math.round(duration);
                this.data.network.latencyMethod = 'image-test';

                console.log('Latency estimated from image test:', this.data.network.estimatedLatency, 'ms');
            };

            img.onerror = () => {
                console.warn('Dynamic bandwidth test failed');
            };

            img.src = testImageUrl;
        } catch (error) {
            console.warn('Could not perform dynamic bandwidth test:', error);
        }
    }

    /**
     * Advanced network information collection with comprehensive fallbacks
     */
    collectAdvancedNetworkInfo() {
        // Collect additional network metrics
        this.data.network.performanceMetrics = this.collectPerformanceMetrics();
        this.data.network.connectionQuality = this.assessConnectionQuality();

        // Monitor network changes
        this.setupNetworkMonitoring();
    }

    /**
     * Collect performance metrics related to network
     */
    collectPerformanceMetrics() {
        const metrics = {};

        try {
            // DNS lookup time
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                metrics.dnsLookup = navigation.domainLookupEnd - navigation.domainLookupStart;
                metrics.tcpConnect = navigation.connectEnd - navigation.connectStart;
                metrics.tlsHandshake = navigation.secureConnectionStart > 0 ?
                    navigation.connectEnd - navigation.secureConnectionStart : 0;
                metrics.serverResponse = navigation.responseStart - navigation.requestStart;
                metrics.contentDownload = navigation.responseEnd - navigation.responseStart;
                metrics.totalLoadTime = navigation.loadEventEnd - navigation.navigationStart;
            }
        } catch (error) {
            console.warn('Could not collect performance metrics:', error);
        }

        return metrics;
    }

    /**
     * Assess connection quality based on collected metrics
     */
    assessConnectionQuality() {
        const quality = {
            rating: 'unknown',
            score: 0,
            factors: {}
        };

        try {
            let score = 0;
            const factors = {};

            // Factor 1: Bandwidth
            if (this.data.network.downlink) {
                const bandwidth = this.data.network.downlink;
                if (bandwidth >= 10) {
                    factors.bandwidth = 'excellent';
                    score += 30;
                } else if (bandwidth >= 5) {
                    factors.bandwidth = 'good';
                    score += 20;
                } else if (bandwidth >= 1) {
                    factors.bandwidth = 'fair';
                    score += 10;
                } else {
                    factors.bandwidth = 'poor';
                    score += 0;
                }
            }

            // Factor 2: RTT (Round Trip Time)
            if (this.data.network.rtt) {
                const rtt = this.data.network.rtt;
                if (rtt <= 50) {
                    factors.latency = 'excellent';
                    score += 25;
                } else if (rtt <= 100) {
                    factors.latency = 'good';
                    score += 20;
                } else if (rtt <= 200) {
                    factors.latency = 'fair';
                    score += 10;
                } else {
                    factors.latency = 'poor';
                    score += 0;
                }
            }

            // Factor 3: Connection type
            const connType = this.data.network.effectiveType;
            if (connType === '4g') {
                factors.connectionType = 'excellent';
                score += 20;
            } else if (connType === '3g') {
                factors.connectionType = 'good';
                score += 15;
            } else if (connType === '2g') {
                factors.connectionType = 'poor';
                score += 5;
            } else if (connType === 'slow-2g') {
                factors.connectionType = 'very-poor';
                score += 0;
            }

            // Factor 4: Save data mode
            if (this.data.network.saveData) {
                factors.saveData = 'enabled';
                score -= 10; // Reduce score if save data is enabled
            }

            // Determine overall rating
            if (score >= 70) {
                quality.rating = 'excellent';
            } else if (score >= 50) {
                quality.rating = 'good';
            } else if (score >= 30) {
                quality.rating = 'fair';
            } else {
                quality.rating = 'poor';
            }

            quality.score = score;
            quality.factors = factors;

        } catch (error) {
            console.warn('Could not assess connection quality:', error);
        }

        return quality;
    }

    /**
     * Setup network monitoring for connection changes
     */
    setupNetworkMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.data.network.onlineStatus = 'online';
            this.data.network.lastOnlineChange = new Date().toISOString();
            console.log('Network status: online');
            this.updateUI();
        });

        window.addEventListener('offline', () => {
            this.data.network.onlineStatus = 'offline';
            this.data.network.lastOfflineChange = new Date().toISOString();
            console.log('Network status: offline');
            this.updateUI();
        });

        // Initial online status
        this.data.network.onlineStatus = navigator.onLine ? 'online' : 'offline';
    }

    /**
     * Update network information (called when connection changes)
     */
    updateNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (connection) {
            this.data.network.connectionType = connection.type || 'unknown';
            this.data.network.effectiveType = connection.effectiveType || 'unknown';
            this.data.network.downlink = connection.downlink || null;
            this.data.network.rtt = connection.rtt || null;
            this.data.network.saveData = connection.saveData || false;

            console.log('Network info updated:', this.data.network);

            // Update UI if analytics are being displayed
            this.updateUI();
        }
    }

    /**
     * Get all collected analytics data
     */
    getAnalyticsData() {
        return {
            ...this.data,
            timestamp: new Date().toISOString(),
            sessionId: this.generateSessionId()
        };
    }

    /**
     * Generate a simple session ID for tracking
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Update the UI with collected analytics data
     */
    updateUI() {
        // Update browser info
        const browserInfoElement = document.getElementById('browserInfo');
        if (browserInfoElement) {
            browserInfoElement.textContent = `${this.data.browser.name} ${this.data.browser.version}`;
        }

        // Update OS info
        const osInfoElement = document.getElementById('osInfo');
        if (osInfoElement) {
            osInfoElement.textContent = this.data.system.os;
        }

        // Update screen info
        const screenInfoElement = document.getElementById('screenInfo');
        if (screenInfoElement) {
            const pixelRatio = this.data.system.devicePixelRatio;
            const pixelRatioText = pixelRatio !== 1 ? ` (${pixelRatio}x)` : '';
            screenInfoElement.textContent = `${this.data.system.screenResolution}${pixelRatioText}`;
        }

        // Update connection info
        const connectionInfoElement = document.getElementById('connectionInfo');
        console.log('Updating connection info UI with:', this.data);
        if (connectionInfoElement) {
            let connectionText = this.data.network.connectionType;

            if (this.data.network.effectiveType && this.data.network.effectiveType !== 'unknown') {
                connectionText += ` (${this.data.network.effectiveType})`;
            }

            // Show downlink from Network Information API or estimated bandwidth
            const bandwidth = this.data.network.downlink || this.data.network.estimatedBandwidth;
            if (bandwidth) {
                connectionText += ` - ${bandwidth} Mbps`;
            }

            // Show RTT if available
            if (this.data.network.rtt) {
                connectionText += ` (${this.data.network.rtt}ms RTT)`;
            }

            // Show connection quality if available
            if (this.data.network.connectionQuality && this.data.network.connectionQuality.rating !== 'unknown') {
                connectionText += ` [${this.data.network.connectionQuality.rating}]`;
            }

            connectionInfoElement.textContent = connectionText;
        }

        // Update Network Metrics panel fields
        this.updateNetworkMetricsPanel();
    }

    /**
     * Update Network Metrics panel with detailed information
     */
    updateNetworkMetricsPanel() {
        // Connection Type
        const connectionTypeElement = document.getElementById('connectionTypeValue');
        if (connectionTypeElement) {
            connectionTypeElement.textContent = this.data.network.connectionType || '-';
        }

        // Effective Type
        const effectiveTypeElement = document.getElementById('effectiveTypeValue');
        if (effectiveTypeElement) {
            effectiveTypeElement.textContent = this.data.network.effectiveType || '-';
        }

        // Downlink
        const downlinkElement = document.getElementById('downlinkValue');
        if (downlinkElement) {
            const downlink = this.data.network.downlink || this.data.network.estimatedBandwidth;
            downlinkElement.textContent = downlink ? `${downlink} Mbps` : '-';
        }

        // RTT
        const rttElement = document.getElementById('rttValue');
        if (rttElement) {
            rttElement.textContent = this.data.network.rtt ? `${this.data.network.rtt} ms` : '-';
        }

        // Current Bandwidth (from performance tracker if available)
        const currentBandwidthElement = document.getElementById('currentNetworkBandwidth');
        if (currentBandwidthElement && window.performanceTracker) {
            const currentBandwidth = window.performanceTracker.metrics.bandwidth.current_bandwidth;
            currentBandwidthElement.textContent = currentBandwidth > 0 ? `${currentBandwidth.toFixed(1)} Mbps` : '-';
        }
    }

    /**
     * Get formatted data for display purposes
     */
    getFormattedData() {
        return {
            browser: `${this.data.browser.name} ${this.data.browser.version}`,
            os: this.data.system.os,
            screen: `${this.data.system.screenResolution} (${this.data.system.devicePixelRatio}x)`,
            connection: this.formatConnectionInfo(),
            language: this.data.browser.language,
            timezone: this.data.system.timezone
        };
    }

    /**
     * Format connection information for display
     */
    formatConnectionInfo() {
        let info = this.data.network.connectionType;

        if (this.data.network.effectiveType && this.data.network.effectiveType !== 'unknown') {
            info += ` (${this.data.network.effectiveType})`;
        }

        if (this.data.network.downlink) {
            info += ` - ${this.data.network.downlink} Mbps`;
        }

        return info;
    }
}

/**
 * Initialize User Analytics
 */
function initializeUserAnalytics() {
    try {
        setAppState('userAnalytics', new UserAnalytics());

        // Update UI with initial data
        userAnalytics.updateUI();

        console.log('User Analytics initialized successfully');
    } catch (error) {
        console.error('Failed to initialize User Analytics:', error);

        // Show fallback data in UI
        updateUserInfoFallback();
    }
}

/**
 * Update user info with fallback data when analytics fail
 */
function updateUserInfoFallback() {
    const browserInfoElement = document.getElementById('browserInfo');
    if (browserInfoElement) {
        browserInfoElement.textContent = 'Unable to detect';
    }

    const osInfoElement = document.getElementById('osInfo');
    if (osInfoElement) {
        osInfoElement.textContent = 'Unable to detect';
    }

    const screenInfoElement = document.getElementById('screenInfo');
    if (screenInfoElement) {
        screenInfoElement.textContent = 'Unable to detect';
    }

    const connectionInfoElement = document.getElementById('connectionInfo');
    if (connectionInfoElement) {
        connectionInfoElement.textContent = 'Unable to detect';
    }
}

// This function is now replaced by the more comprehensive checkDependencies function added earlier
/**
 
* Dashboard Class - Manages the visual presentation and real-time updates of all collected data
 */
class Dashboard {
    constructor() {
        this.updateInterval = null;
        this.isUpdating = false;
        this.lastUpdateTime = 0;
        this.updateFrequency = 20000; // Update every 20 seconds

        // Cache DOM elements for better performance
        this.elements = {
            // User Information elements
            browserInfo: document.getElementById('browserInfo'),
            osInfo: document.getElementById('osInfo'),
            screenInfo: document.getElementById('screenInfo'),
            connectionInfo: document.getElementById('connectionInfo'),




        };

        // Initialize chart manager
        this.chartManager = new ChartManager();

        console.log('Dashboard initialized');

        // Test elements availability
        console.log('Testing dashboard elements - Stream Performance elements removed');
    }

    /**
     * Initialize the dashboard layout and start real-time updates
     */
    initializeLayout() {
        // Initialize charts
        this.chartManager.initializeCharts();

        // Populate initial user information
        this.updateUserInfo();

        // Start real-time updates
        this.startRealTimeUpdates();

        console.log('Dashboard layout initialized');
    }

    /**
     * Start real-time data updates
     */
    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.isUpdating = true;
        this.updateInterval = setInterval(() => {
            this.performRealTimeUpdate();
        }, this.updateFrequency);

        console.log('Real-time updates started');
    }

    /**
     * Stop real-time data updates
     */
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isUpdating = false;

        console.log('Real-time updates stopped');
    }

    /**
     * Perform a real-time update of all dashboard data
     */
    performRealTimeUpdate() {
        const currentTime = performance.now();

        // Throttle updates to prevent excessive DOM manipulation
        if (currentTime - this.lastUpdateTime < this.updateFrequency - 100) {
            return;
        }

        try {
            // Update user information (less frequent updates needed)
            if (currentTime - this.lastUpdateTime > 20000) { // Update every 20 seconds
                this.updateUserInfo();
            }

            // Update stream information (real-time)
            this.updateStreamInfo();

            // Update error monitoring (real-time)
            this.updateErrorInfo();

            // Update charts (real-time)
            this.updateCharts();

            this.lastUpdateTime = currentTime;
        } catch (error) {
            console.error('Error during real-time update:', error);
        }
    }

    /**
     * Update user information display panel (optimized with batch updates)
     */
    updateUserInfo() {
        if (!userAnalytics) return;

        // Use batch update system for better performance
        batchUpdate(() => {
            try {
                const analyticsData = userAnalytics.getAnalyticsData();
                const userCard = document.querySelector('.card:has(#userInfo)');

                // Mark card as updating
                if (userCard) userCard.classList.add('card--updating');

                // Batch all DOM updates together
                const updates = [];

                // Update browser information
                if (this.elements.browserInfo && analyticsData.browser) {
                    const browserText = `${analyticsData.browser.name} ${analyticsData.browser.version}`;
                    updates.push(() => this.updateElementWithAnimation(this.elements.browserInfo, browserText));
                }

                // Update OS information
                if (this.elements.osInfo && analyticsData.system) {
                    const osText = `${analyticsData.system.os} (${analyticsData.system.platform})`;
                    updates.push(() => this.updateElementWithAnimation(this.elements.osInfo, osText));
                }

                // Update screen information
                if (this.elements.screenInfo && analyticsData.system) {
                    const screenText = `${analyticsData.system.screenResolution} (${analyticsData.system.devicePixelRatio}x DPR)`;
                    updates.push(() => this.updateElementWithAnimation(this.elements.screenInfo, screenText));
                }

                // Update connection information
                if (this.elements.connectionInfo && analyticsData.network) {
                    let connectionText = 'Unknown';
                    if (analyticsData.network.connectionType) {
                        connectionText = `${analyticsData.network.connectionType}`;
                        if (analyticsData.network.effectiveType) {
                            connectionText += ` (${analyticsData.network.effectiveType})`;
                        }
                        if (analyticsData.network.downlink) {
                            connectionText += ` - ${analyticsData.network.downlink} Mbps`;
                        }
                    }
                    updates.push(() => this.updateElementWithAnimation(this.elements.connectionInfo, connectionText));
                }

                // Execute all updates in a single frame
                updates.forEach(update => update());

                // Remove updating class after animation
                setTimeout(() => {
                    if (userCard) userCard.classList.remove('card--updating');
                }, 500);

            } catch (error) {
                console.error('Error updating user info:', error);
            }
        });
    }

    /**
     * Update stream information display panel (optimized with batch updates)
     */
    updateStreamInfo() {
        if (!streamAnalytics) {
            console.log('StreamAnalytics not available');
            return;
        }

        // Use batch update system for better performance
        batchUpdate(() => {
            try {
                const metrics = streamAnalytics.getStreamMetrics();
                const performanceStats = streamAnalytics.getPerformanceStats();
                const streamCard = document.querySelector('.card:has(#streamInfo)');

                // Debug logs (commented out to reduce console spam)
                // console.log('Stream metrics:', metrics);
                // Stream Performance elements removed

                // Mark card as updating
                if (streamCard) streamCard.classList.add('card--updating');

                // Batch all DOM updates together
                const updates = [];

                // Stream Performance card removed - metrics now in Overview panel

                // Execute all updates in a single frame
                updates.forEach(update => update());

                // Remove updating class after animation
                setTimeout(() => {
                    if (streamCard) streamCard.classList.remove('card--updating');
                }, 500);

            } catch (error) {
                console.error('Error updating stream info:', error);
            }
        });
    }

    /**
     * Update error monitoring display panel
     */
    updateErrorInfo() {
        if (!streamAnalytics) return;

        try {
            const performanceStats = streamAnalytics.getPerformanceStats();
            const errorCard = document.querySelector('.card:has(#errorInfo)');

            // Mark card as updating
            if (errorCard) errorCard.classList.add('card--updating');

            // Update buffer errors
            if (this.elements.bufferErrors) {
                const bufferErrorCount = performanceStats.bufferUnderruns + performanceStats.errorCategories.buffer;
                this.updateElementWithAnimation(this.elements.bufferErrors, bufferErrorCount.toString());
            }

            // Update network errors
            if (this.elements.networkErrors) {
                const networkErrorCount = performanceStats.errorCategories.network;
                this.updateElementWithAnimation(this.elements.networkErrors, networkErrorCount.toString());
            }

            // Update latency information
            if (this.elements.latencyInfo && performanceStats.latency) {
                const latencyText = `${performanceStats.latency.toFixed(0)}ms`;
                this.updateElementWithAnimation(this.elements.latencyInfo, latencyText);
            }

            // Update buffer health
            if (this.elements.bufferHealth && performanceStats.bufferHealth !== undefined) {
                const bufferHealthText = `${(performanceStats.bufferHealth * 100).toFixed(1)}%`;
                this.updateElementWithAnimation(this.elements.bufferHealth, bufferHealthText);

                // Add color coding based on buffer health
                const element = this.elements.bufferHealth;
                element.style.color = this.getHealthColor(performanceStats.bufferHealth);
            }

            // Remove updating class after animation
            setTimeout(() => {
                if (errorCard) errorCard.classList.remove('card--updating');
            }, 500);

        } catch (error) {
            console.error('Error updating error info:', error);
        }
    }

    /**
     * Update charts with current performance data
     */
    updateCharts() {
        if (!streamAnalytics || !userAnalytics) return;

        try {
            const userAnalyticsData = userAnalytics.getAnalyticsData();

            // Get bandwidth data
            let bandwidthMbps = 0;
            if (userAnalyticsData.network && userAnalyticsData.network.downlink) {
                bandwidthMbps = userAnalyticsData.network.downlink;
            }

            // Update network chart
            this.chartManager.updateNetworkChart(bandwidthMbps);

            // Get FPS data from PerformanceTracker
            let currentFPS = 0;
            if (window.performanceTracker && window.performanceTracker.metrics.fps) {
                currentFPS = window.performanceTracker.metrics.fps.current_fps || 0;
            }

            // Update FPS chart
            this.chartManager.updateFPSChart(currentFPS);
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    /**
     * Update element content with smooth animation
     */
    updateElementWithAnimation(element, newValue) {
        if (!element || element.textContent === newValue) return;

        // Add update animation class
        element.classList.add('updating');

        // Update the content
        element.textContent = newValue;

        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('updating');
        }, 300);
    }

    /**
     * Get color based on health percentage
     */
    getHealthColor(healthValue) {
        if (healthValue >= 0.8) return 'var(--color-success)';
        if (healthValue >= 0.5) return 'var(--color-warning)';
        return 'var(--color-error)';
    }

    /**
     * Test function to manually update stream info
     */
    testStreamInfoUpdate() {
        console.log('Stream Performance card removed - test method deprecated');
    }

    /**
     * Show error message in dashboard
     */
    showError(message) {
        console.error('Dashboard Error:', message);

        // You could implement a toast notification system here
        // For now, we'll just log the error
    }

    /**
     * Reset all dashboard displays
     */
    reset() {
        const defaultValues = {
            browserInfo: 'Loading...',
            osInfo: 'Loading...',
            screenInfo: 'Loading...',
            connectionInfo: 'Loading...',

            bufferErrors: '0',
            networkErrors: '0',
            latencyInfo: '-',
            bufferHealth: '-'
        };

        Object.keys(defaultValues).forEach(key => {
            if (this.elements[key]) {
                this.elements[key].textContent = defaultValues[key];
                this.elements[key].style.color = '';
            }
        });

        // Reset charts
        if (this.chartManager) {
            this.chartManager.resetCharts();
        }
    }

    /**
     * Destroy dashboard and cleanup
     */
    destroy() {
        this.stopRealTimeUpdates();

        // Destroy charts
        if (this.chartManager) {
            this.chartManager.destroy();
            this.chartManager = null;
        }

        this.elements = {};
        console.log('Dashboard destroyed');
    }
}

// Global dashboard instance
let dashboard = null;

/**
 * Initialize Dashboard Component
 */
function initializeDashboard() {
    try {
        dashboard = new Dashboard();

        // Make dashboard globally accessible for lazy loading
        window.dashboard = dashboard;

        if (!dashboard) {
            throw new Error('Failed to create Dashboard instance');
        }

        dashboard.initializeLayout();

        // Set global chart manager reference with error handling
        try {
            chartManager = dashboard.chartManager;
            if (!chartManager) {
                console.warn('Chart manager not available - charts may not work');
                showGlobalMessage('Charts may not be available due to missing dependencies', 'warning');
            }
        } catch (chartError) {
            console.warn('Failed to initialize chart manager:', chartError);
            showGlobalMessage('Chart functionality is not available', 'warning');
        }

        console.log('Dashboard component initialized');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showGlobalError('Failed to initialize dashboard. Some features may not work properly.');

        // Try to initialize basic fallback dashboard
        try {
            initializeFallbackDashboard();
        } catch (fallbackError) {
            console.error('Failed to initialize fallback dashboard:', fallbackError);
        }
    }
}

/**
 * Initialize a basic fallback dashboard when main dashboard fails
 */
function initializeFallbackDashboard() {
    try {
        // Set basic fallback values for dashboard elements
        const fallbackElements = [
            { id: 'browserInfo', value: 'Dashboard Error' },
            { id: 'osInfo', value: 'Dashboard Error' },
            { id: 'screenInfo', value: 'Dashboard Error' },
            { id: 'connectionInfo', value: 'Dashboard Error' },

            { id: 'frameRateInfo', value: 'N/A' },
            { id: 'loadTimeInfo', value: 'N/A' },
            { id: 'bufferErrors', value: 'N/A' },
            { id: 'networkErrors', value: 'N/A' },
            { id: 'latencyInfo', value: 'N/A' },
            { id: 'bufferHealth', value: 'N/A' }
        ];

        fallbackElements.forEach(element => {
            try {
                const domElement = document.getElementById(element.id);
                if (domElement) {
                    domElement.textContent = element.value;
                    domElement.style.color = 'var(--color-error)';
                }
            } catch (elementError) {
                console.warn(`Failed to set fallback for element ${element.id}:`, elementError);
            }
        });

        console.log('Fallback dashboard initialized');
    } catch (error) {
        console.error('Failed to initialize fallback dashboard:', error);
    }
}

/**
 * Update dashboard when stream starts
 */
function updateDashboardForStream() {
    try {
        // Make dashboard available globally for testing
        window.testDashboard = window.dashboard;

        // Test live indicator positioning
        window.testLiveIndicator = function () {
            const liveIndicator = document.getElementById('liveIndicator');
            const overlay = document.querySelector('.video-controls-overlay');
            const container = document.querySelector('.video-container');

            console.log('Live indicator test:', {
                indicator: liveIndicator ? 'found' : 'missing',
                overlay: overlay ? 'found' : 'missing',
                container: container ? 'found' : 'missing',
                indicatorStyle: liveIndicator ? {
                    display: liveIndicator.style.display,
                    position: getComputedStyle(liveIndicator).position,
                    top: getComputedStyle(liveIndicator).top,
                    left: getComputedStyle(liveIndicator).left,
                    zIndex: getComputedStyle(liveIndicator).zIndex
                } : 'N/A'
            });

            if (liveIndicator) {
                showLiveIndicator();
            }
        };

        if (dashboard && typeof dashboard.performRealTimeUpdate === 'function') {
            // Force immediate update when stream starts
            dashboard.performRealTimeUpdate();
        } else {
            console.warn('Dashboard not available or performRealTimeUpdate method missing');
        }
    } catch (error) {
        console.error('Failed to update dashboard for stream:', error);
    }
}

/**
 * Reset dashboard when stream stops
 */
function resetDashboardForStream() {
    try {
        if (dashboard && typeof dashboard.reset === 'function') {
            dashboard.reset();
        } else {
            console.warn('Dashboard not available or reset method missing');
            // Manually reset dashboard elements
            resetDashboardElementsManually();
        }
    } catch (error) {
        console.error('Failed to reset dashboard for stream:', error);
        // Try manual reset as fallback
        try {
            resetDashboardElementsManually();
        } catch (fallbackError) {
            console.error('Failed to manually reset dashboard elements:', fallbackError);
        }
    }
}

/**
 * Manually reset dashboard elements when dashboard.reset() fails
 */
function resetDashboardElementsManually() {
    try {
        const resetElements = [
            { id: 'bitrateInfo', value: '-' },
            { id: 'resolutionInfo', value: '-' },
            { id: 'frameRateInfo', value: '-' },
            { id: 'loadTimeInfo', value: '-' },
            { id: 'bufferErrors', value: '0' },
            { id: 'networkErrors', value: '0' },
            { id: 'latencyInfo', value: '-' },
            { id: 'bufferHealth', value: '-' }
        ];

        resetElements.forEach(element => {
            try {
                const domElement = document.getElementById(element.id);
                if (domElement) {
                    domElement.textContent = element.value;
                    domElement.style.color = '';
                }
            } catch (elementError) {
                console.warn(`Failed to reset element ${element.id}:`, elementError);
            }
        });

        console.log('Dashboard elements reset manually');
    } catch (error) {
        console.error('Failed to manually reset dashboard elements:', error);
    }
}

/**
 * ChartManager Class - Manages Chart.js charts for performance metrics visualization
 */
class ChartManager {
    constructor() {
        this.charts = {};
        this.chartData = {
            bandwidth: {
                labels: [],
                data: [],
                maxDataPoints: 30
            },
            fps: {
                labels: [],
                data: [],
                maxDataPoints: 30
            },
            bufferHealth: {
                value: 0
            }
        };

        this.isInitialized = false;
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded. Charts will not be available.');
            return;
        }

        try {
            this.createNetworkChart();
            this.createFPSChart();
            this.isInitialized = true;
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Failed to initialize charts:', error);
        }
    }

    /**
     * Create network performance chart (bandwidth only)
     */
    createNetworkChart() {
        const canvas = document.getElementById('networkChart');
        if (!canvas) {
            console.warn('Network chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');

        this.charts.network = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartData.bandwidth.labels,
                datasets: [
                    {
                        label: 'Bandwidth (Mbps)',
                        data: this.chartData.bandwidth.data,
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: 'rgb(37, 99, 235)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f8fafc',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: '#334155',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function (context) {
                                return `Time: ${context[0].label}`;
                            },
                            label: function (context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                return `${label}: ${value.toFixed(2)} Mbps`;
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
                            color: '#94a3b8',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 10
                            },
                            maxTicksLimit: 8
                        },
                        grid: {
                            color: 'rgba(51, 65, 85, 0.3)',
                            drawBorder: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Bandwidth (Mbps)',
                            color: 'rgb(37, 99, 235)',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 10
                            },
                            callback: function (value) {
                                return value.toFixed(1) + ' Mbps';
                            }
                        },
                        grid: {
                            color: 'rgba(51, 65, 85, 0.3)',
                            drawBorder: false
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Create FPS performance chart
     */
    createFPSChart() {
        const canvas = document.getElementById('fpsChart');
        if (!canvas) {
            console.warn('FPS chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');

        this.charts.fps = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartData.fps.labels,
                datasets: [
                    {
                        label: 'FPS',
                        data: this.chartData.fps.data,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: 'rgb(16, 185, 129)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f8fafc',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return `FPS: ${context.parsed.y.toFixed(1)}`;
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
                            color: '#64748b',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 10
                            },
                            maxTicksLimit: 8
                        },
                        grid: {
                            color: 'rgba(51, 65, 85, 0.3)',
                            drawBorder: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'FPS',
                            color: 'rgb(16, 185, 129)',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 10
                            },
                            callback: function (value) {
                                return value.toFixed(0) + ' fps';
                            }
                        },
                        grid: {
                            color: 'rgba(51, 65, 85, 0.3)',
                            drawBorder: false
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Update network chart with new data
     */
    updateNetworkChart(bandwidthMbps) {
        if (!this.charts.network || !this.isInitialized || typeof Chart === 'undefined') return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', {
            hour12: false,
            minute: '2-digit',
            second: '2-digit'
        });

        // Add new data points
        this.chartData.bandwidth.labels.push(timeLabel);
        this.chartData.bandwidth.data.push(bandwidthMbps || 0);

        // Remove old data points if we exceed max
        if (this.chartData.bandwidth.labels.length > this.chartData.bandwidth.maxDataPoints) {
            this.chartData.bandwidth.labels.shift();
            this.chartData.bandwidth.data.shift();
        }

        // Update chart
        this.charts.network.data.labels = this.chartData.bandwidth.labels;
        this.charts.network.data.datasets[0].data = this.chartData.bandwidth.data;

        this.charts.network.update('none'); // No animation for real-time updates
    }

    /**
     * Update FPS chart with new data
     */
    updateFPSChart(fps) {
        if (!this.charts.fps || !this.isInitialized || typeof Chart === 'undefined') return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', {
            hour12: false,
            minute: '2-digit',
            second: '2-digit'
        });

        // Add new data points
        this.chartData.fps.labels.push(timeLabel);
        this.chartData.fps.data.push(fps || 0);

        // Remove old data points if we exceed max
        if (this.chartData.fps.labels.length > this.chartData.fps.maxDataPoints) {
            this.chartData.fps.labels.shift();
            this.chartData.fps.data.shift();
        }

        // Update chart
        this.charts.fps.data.labels = this.chartData.fps.labels;
        this.charts.fps.data.datasets[0].data = this.chartData.fps.data;

        this.charts.fps.update('none'); // No animation for real-time updates
    }

    /**
     * Reset all charts
     */
    resetCharts() {
        // Clear data
        this.chartData.bandwidth.labels = [];
        this.chartData.bandwidth.data = [];
        this.chartData.fps.labels = [];
        this.chartData.fps.data = [];

        // Update charts
        if (this.charts.network) {
            this.charts.network.data.labels = [];
            this.charts.network.data.datasets[0].data = [];
            this.charts.network.update();
        }

        if (this.charts.fps) {
            this.charts.fps.data.labels = [];
            this.charts.fps.data.datasets[0].data = [];
            this.charts.fps.update();
        }

        console.log('Charts reset');
    }

    /**
     * Destroy all charts
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
        this.isInitialized = false;
        console.log('Charts destroyed');
    }
}

// Global chart manager instance
let chartManager = null;
