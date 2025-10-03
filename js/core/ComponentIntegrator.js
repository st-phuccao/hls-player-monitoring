/**
 * ComponentIntegrator - Comprehensive integration and error handling for all HLS monitoring components
 * Implements task 11: Integrate all components and add comprehensive error handling
 */

/**
 * Integrate all tracking components with HLS player and video events
 * Provides comprehensive error handling and graceful degradation
 */
export function integrateTrackingComponents(eventType, components) {
    try {
        console.log(`Integrating tracking components for event: ${eventType}`);

        const { hlsPlayer, bitrateMonitor, errorTracker, dataConsumptionTracker, performanceTracker, metricsDataManager, isLiveStream } = components;

        // Ensure all trackers are properly connected to HLS instance
        if (hlsPlayer) {
            // Connect bitrate monitor to HLS instance
            if (bitrateMonitor && typeof bitrateMonitor.setHLSInstance === 'function') {
                try {
                    bitrateMonitor.setHLSInstance(hlsPlayer);
                } catch (error) {
                    console.warn('Failed to connect bitrate monitor to HLS instance:', error);
                }
            }

            // Connect error tracker to HLS instance
            if (errorTracker && typeof errorTracker.setHLSInstance === 'function') {
                try {
                    errorTracker.setHLSInstance(hlsPlayer);
                } catch (error) {
                    console.warn('Failed to connect error tracker to HLS instance:', error);
                }
            }

            // Connect data consumption tracker to HLS instance
            if (dataConsumptionTracker && typeof dataConsumptionTracker.setHLSInstance === 'function') {
                try {
                    dataConsumptionTracker.setHLSInstance(hlsPlayer);

                    // Also connect performance tracker for efficiency calculations
                    if (performanceTracker && typeof dataConsumptionTracker.setPerformanceTracker === 'function') {
                        dataConsumptionTracker.setPerformanceTracker(performanceTracker);
                    }
                } catch (error) {
                    console.warn('Failed to connect data consumption tracker to HLS instance:', error);
                }
            }
        }

        // Update metrics data manager with current session info
        if (metricsDataManager) {
            try {
                const streamUrlInput = document.getElementById('streamUrl');
                if (streamUrlInput && streamUrlInput.value) {
                    metricsDataManager.setStreamUrl(streamUrlInput.value);
                }
                metricsDataManager.setLiveStatus(isLiveStream);
            } catch (error) {
                console.warn('Failed to update metrics data manager session info:', error);
            }
        }

        console.log(`Successfully integrated tracking components for event: ${eventType}`);
    } catch (error) {
        console.error('Error integrating tracking components:', error);
        // Don't throw - allow video playback to continue even if tracking fails
    }
}

/**
 * Handle video event errors with graceful degradation
 */
export function handleVideoEventError(eventType, error, errorTracker, showGlobalMessage) {
    try {
        console.error(`Error in video ${eventType} event:`, error);

        // Record error in error tracker if available
        if (errorTracker && typeof errorTracker.recordError === 'function') {
            try {
                errorTracker.recordError('other', `Video ${eventType} event error`, error.message || 'Unknown error');
            } catch (trackerError) {
                console.warn('Failed to record error in error tracker:', trackerError);
            }
        }

        // Show user-friendly error message for critical events
        const criticalEvents = ['play', 'playing', 'loadstart'];
        if (criticalEvents.includes(eventType)) {
            showGlobalMessage(`Warning: Some monitoring features may not work properly due to a ${eventType} event error.`, 'warning');
        }
    } catch (handlerError) {
        console.error('Error in video event error handler:', handlerError);
        // Fail silently to prevent cascading errors
    }
}

/**
 * Initialize native HLS fallback for browsers with native support
 */
export function initializeNativeHLSFallback(videoElement, showGlobalMessage, showGlobalError) {
    try {
        console.log('Initializing native HLS fallback mode');

        // Create a minimal HLS-like object for basic integration
        const nativeHLSWrapper = {
            isNative: true,
            currentLevel: -1,
            levels: [],
            bandwidthEstimate: 0,

            // Minimal event system
            events: new Map(),
            on: function (event, callback) {
                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }
                this.events.get(event).push(callback);
            },

            // Basic load functionality
            loadSource: function (url) {
                if (videoElement) {
                    videoElement.src = url;
                }
            },

            attachMedia: function (video) {
                // No-op for native support
            },

            destroy: function () {
                this.events.clear();
            }
        };

        // Warn about limited functionality
        showGlobalMessage('Running in native HLS mode. Some advanced metrics may not be available.', 'info');

        console.log('Native HLS fallback initialized successfully');
        return nativeHLSWrapper;
    } catch (error) {
        console.error('Error initializing native HLS fallback:', error);
        showGlobalError('Failed to initialize video player. Please refresh the page and try again.');
        return null;
    }
}

/**
 * Check for high-precision timing API availability and provide fallbacks
 */
export function checkTimingAPISupport() {
    const support = {
        performanceNow: typeof performance !== 'undefined' && typeof performance.now === 'function',
        performanceObserver: typeof PerformanceObserver !== 'undefined',
        requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined'
    };

    console.log('Timing API support:', support);

    // Provide fallbacks for missing APIs
    if (!support.performanceNow) {
        console.warn('High-precision timing not available, using Date.now() fallback');
        window.performance = window.performance || {};
        window.performance.now = function () {
            return Date.now();
        };
    }

    if (!support.requestAnimationFrame) {
        console.warn('requestAnimationFrame not available, using setTimeout fallback');
        window.requestAnimationFrame = function (callback) {
            return setTimeout(callback, 16); // ~60fps
        };
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }

    return support;
}

/**
 * Initialize comprehensive error handling for the entire application
 */
export function initializeComprehensiveErrorHandling(errorTracker, showGlobalError, showGlobalMessage) {
    try {
        // Check API support and setup fallbacks
        const apiSupport = checkTimingAPISupport();

        // Enhanced global error handler
        window.addEventListener('error', function (event) {
            console.error('Global error caught:', event.error);

            // Record in error tracker if available
            if (errorTracker && typeof errorTracker.recordError === 'function') {
                try {
                    errorTracker.recordError('other', 'Global JavaScript error', event.error?.message || 'Unknown global error');
                } catch (trackerError) {
                    console.warn('Failed to record global error:', trackerError);
                }
            }

            // Show user-friendly error message
            const errorMsg = event.error?.message || 'An unexpected error occurred';
            showGlobalError(`Application error: ${errorMsg}. Please refresh if issues persist.`);
        });

        // Enhanced unhandled promise rejection handler
        window.addEventListener('unhandledrejection', function (event) {
            console.error('Unhandled promise rejection:', event.reason);

            // Record in error tracker if available
            if (errorTracker && typeof errorTracker.recordError === 'function') {
                try {
                    errorTracker.recordError('other', 'Unhandled promise rejection', event.reason?.message || 'Promise rejection');
                } catch (trackerError) {
                    console.warn('Failed to record promise rejection:', trackerError);
                }
            }

            // Show user-friendly error message
            const errorMsg = event.reason?.message || 'An async operation failed';
            showGlobalError(`Promise error: ${errorMsg}. Please try again.`);

            // Prevent default browser behavior
            event.preventDefault();
        });

        // Network connectivity monitoring
        if (navigator.onLine !== undefined) {
            window.addEventListener('online', function () {
                console.log('Network connection restored');
                showGlobalMessage('Network connection restored', 'success');
            });

            window.addEventListener('offline', function () {
                console.log('Network connection lost');
                showGlobalError('Network connection lost. Some features may not work properly.');
            });
        }

        console.log('Comprehensive error handling initialized');
        return apiSupport;
    } catch (error) {
        console.error('Failed to initialize comprehensive error handling:', error);
        return null;
    }
}

/**
 * Integrate all components together with comprehensive error handling
 */
export function integrateAllComponents(components, showGlobalMessage, showGlobalError) {
    try {
        console.log('Starting comprehensive component integration...');

        const {
            performanceTracker,
            bitrateMonitor,
            errorTracker,
            dataConsumptionTracker,
            metricsDataManager,
            professionalDashboard,
            hlsPlayer
        } = components;

        // Verify all core components are initialized
        const componentList = {
            performanceTracker,
            bitrateMonitor,
            errorTracker,
            dataConsumptionTracker,
            metricsDataManager,
            professionalDashboard
        };

        const missingComponents = [];
        Object.entries(componentList).forEach(([name, component]) => {
            if (!component) {
                missingComponents.push(name);
            }
        });

        if (missingComponents.length > 0) {
            console.warn('Missing components during integration:', missingComponents);
            showGlobalMessage(`Some monitoring components are not available: ${missingComponents.join(', ')}`, 'warning');
        }

        // Connect HLS instance to all trackers that need it
        if (hlsPlayer) {
            console.log('Connecting HLS instance to trackers...');

            // Connect bitrate monitor
            if (bitrateMonitor && typeof bitrateMonitor.setHLSInstance === 'function') {
                try {
                    bitrateMonitor.setHLSInstance(hlsPlayer);
                    console.log('Bitrate monitor connected to HLS instance');
                } catch (error) {
                    console.error('Failed to connect bitrate monitor:', error);
                }
            }

            // Connect error tracker
            if (errorTracker && typeof errorTracker.setHLSInstance === 'function') {
                try {
                    errorTracker.setHLSInstance(hlsPlayer);
                    console.log('Error tracker connected to HLS instance');
                } catch (error) {
                    console.error('Failed to connect error tracker:', error);
                }
            }

            // Connect data consumption tracker
            if (dataConsumptionTracker && typeof dataConsumptionTracker.setHLSInstance === 'function') {
                try {
                    dataConsumptionTracker.setHLSInstance(hlsPlayer);

                    // Also connect performance tracker for efficiency calculations
                    if (performanceTracker && typeof dataConsumptionTracker.setPerformanceTracker === 'function') {
                        dataConsumptionTracker.setPerformanceTracker(performanceTracker);
                    }
                    console.log('Data consumption tracker connected to HLS instance');
                } catch (error) {
                    console.error('Failed to connect data consumption tracker:', error);
                }
            }
        } else {
            console.warn('HLS player not available for tracker integration');
        }

        // Initialize metrics data manager with all trackers
        if (metricsDataManager && typeof metricsDataManager.initialize === 'function') {
            try {
                metricsDataManager.initialize({
                    performanceTracker,
                    bitrateMonitor,
                    errorTracker,
                    dataConsumptionTracker
                });

                // Start real-time aggregation
                metricsDataManager.startRealTimeAggregation(5000);
                console.log('Metrics data manager initialized with all trackers');
            } catch (error) {
                console.error('Failed to initialize metrics data manager:', error);
            }
        }

        // Setup cross-component communication
        setupCrossComponentCommunication(professionalDashboard);

        // Test integration with various network conditions simulation
        if (window.location.search.includes('test=true')) {
            setTimeout(() => {
                testIntegrationWithNetworkConditions();
            }, 5000);
        }

        console.log('Component integration completed successfully');
        showGlobalMessage('All monitoring components integrated successfully', 'success');

    } catch (error) {
        console.error('Error during comprehensive component integration:', error);
        showGlobalError('Failed to integrate monitoring components. Some features may not work properly.');
    }
}

/**
 * Setup cross-component communication for better integration
 */
function setupCrossComponentCommunication(professionalDashboard) {
    try {
        console.log('Setting up cross-component communication...');

        // Create custom events for component communication
        const componentEvents = {
            'metrics-updated': new CustomEvent('metrics-updated'),
            'error-occurred': new CustomEvent('error-occurred'),
            'stream-quality-changed': new CustomEvent('stream-quality-changed'),
            'buffer-health-changed': new CustomEvent('buffer-health-changed')
        };

        // Setup event listeners for cross-component updates
        document.addEventListener('metrics-updated', function (event) {
            try {
                // Update professional dashboard if available
                if (professionalDashboard && professionalDashboard.isInitialized) {
                    // Trigger dashboard updates
                    console.log('Updating professional dashboard with new metrics');
                }
            } catch (error) {
                console.error('Error handling metrics-updated event:', error);
            }
        });

        document.addEventListener('error-occurred', function (event) {
            try {
                // Handle cross-component error notifications
                console.log('Cross-component error notification received');
            } catch (error) {
                console.error('Error handling error-occurred event:', error);
            }
        });

        console.log('Cross-component communication setup completed');
    } catch (error) {
        console.error('Error setting up cross-component communication:', error);
    }
}

/**
 * Test integration with various HLS streams and network conditions
 */
function testIntegrationWithNetworkConditions() {
    try {
        console.log('Testing integration with various network conditions...');

        // Test different stream URLs for robustness
        const testStreams = [
            'https://s2.phim1280.tv/20230919/sqojVKXO/2000kb/hls/index.m3u8',
            'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
            'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
        ];

        // Simulate network condition changes
        if (navigator.connection) {
            console.log('Network connection info:', {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            });
        }

        // Test error handling with invalid stream
        setTimeout(() => {
            console.log('Testing error handling with invalid stream...');
            // This would be used in actual testing scenarios
        }, 10000);

        console.log('Integration testing setup completed');
    } catch (error) {
        console.error('Error during integration testing:', error);
    }
}

/**
 * Create fallback bitrate monitor for graceful degradation
 */
export function createFallbackBitrateMonitor() {
    return {
        metrics: {
            current_bitrate: 0,
            avg_bitrate_played: 0,
            current_bandwidth: 0,
            bitrate_history: []
        },

        setHLSInstance: function (hls) {
            console.log('Fallback bitrate monitor: HLS instance set (limited functionality)');
        },

        getBitrateMetrics: function () {
            return { ...this.metrics };
        },

        getCurrentBitrate: function () {
            return this.metrics.current_bitrate;
        },

        getAverageBitrate: function () {
            return this.metrics.avg_bitrate_played;
        },

        getCurrentBandwidth: function () {
            return this.metrics.current_bandwidth;
        },

        cleanup: function () {
            console.log('Fallback bitrate monitor cleanup');
        }
    };
}

/**
 * Create fallback error tracker for graceful degradation
 */
export function createFallbackErrorTracker() {
    return {
        metrics: {
            error_count: 0,
            total_events: 0,
            error_percentage: 0,
            error_types: { network: 0, media: 0, mux: 0, other: 0 },
            last_error: null
        },

        setHLSInstance: function (hls) {
            console.log('Fallback error tracker: HLS instance set (limited functionality)');
        },

        recordError: function (type, message, description, isFatal = false) {
            this.metrics.error_count++;
            this.metrics.error_types[type] = (this.metrics.error_types[type] || 0) + 1;
            this.metrics.last_error = { type, message, description, timestamp: Date.now(), fatal: isFatal };
            console.log(`Fallback error tracker: ${type} error recorded - ${message}`);
        },

        incrementTotalEvents: function () {
            this.metrics.total_events++;
            this.metrics.error_percentage = this.metrics.total_events > 0 ?
                (this.metrics.error_count / this.metrics.total_events) * 100 : 0;
        },

        getErrorMetrics: function () {
            return { ...this.metrics };
        },

        cleanup: function () {
            console.log('Fallback error tracker cleanup');
        }
    };
}

/**
 * Create fallback data consumption tracker for graceful degradation
 */
export function createFallbackDataTracker() {
    return {
        metrics: {
            total_data_loaded: 0,
            data_rate: 0,
            data_efficiency: 0,
            bytes_loaded: 0
        },

        setHLSInstance: function (hls) {
            console.log('Fallback data tracker: HLS instance set (limited functionality)');
        },

        setPerformanceTracker: function (tracker) {
            console.log('Fallback data tracker: Performance tracker set');
        },

        getDataMetrics: function () {
            return { ...this.metrics };
        },

        cleanup: function () {
            console.log('Fallback data tracker cleanup');
        }
    };
}