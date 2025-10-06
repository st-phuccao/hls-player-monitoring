/**
 * MetricsDataManager - Organizes all collected metrics into structured data for display and server transmission
 * Implements Requirements 11.1, 11.2, 11.3, 11.4
 */
export default class MetricsDataManager {
    constructor() {
        this.metrics = {
            // Startup Performance
            startup: {
                startup_time: null,
                timestamp: null
            },

            // Rebuffering Metrics
            rebuffering: {
                rebuffer_count: 0,
                rebuffer_duration: 0,
                rebuffer_ratio: 0,
                last_rebuffer_time: null
            },

            // Playback Tracking
            playback: {
                watch_time: 0,
                playback_ratio: 0
            },

            // Frame Performance
            frames: {
                dropped_frames: 0,
                total_frames: 0,
                dropped_frame_ratio: 0,
                last_update: null
            },

            // FPS Metrics
            fps: {
                current_fps: 0,
                min_fps: null,
                max_fps: 0,
                avg_fps: 0
            },

            // Bitrate and Quality
            bitrate: {
                current_bitrate: 0,
                avg_bitrate_played: 0,
                max_bitrate: 0,
                bitrate_history: [],
                bitrate_sum: 0,
                bitrate_count: 0
            },

            // Bandwidth Metrics
            bandwidth: {
                current_bandwidth: 0,
                bandwidth_history: [],
                last_bandwidth_update: null
            },

            // Segment Performance
            segments: {
                max_segment_duration: 0,
                min_segment_duration: null,
                avg_segment_load_time: 0,
                min_segment_loadtime: null,
                max_segment_loadtime: 0,
                total_segment_loaded: 0,
                segment_load_history: []
            },

            // Playlist Performance
            playlist: {
                avg_playlist_reload_time: 0,
                min_playlist_reload_time: null,
                max_playlist_reload_time: 0,
                reload_count: 0,
                reload_history: []
            },

            // Error and Data Tracking
            errors: {
                error_count: 0,
                total_events: 0,
                error_percentage: 0,
                error_types: {},
                last_error: null
            },

            // Data Consumption
            data: {
                total_data_loaded: 0,
                data_rate: 0,
                data_efficiency: 0
            },

            // Session Information
            session: {
                start_time: null,
                current_time: null,
                session_duration: 0,
                stream_url: '',
                is_live: false,
                session_id: null
            },

            // User Information
            user: {
                user_agent: '',
                browser_name: '',
                browser_version: '',
                platform: '',
                language: '',
                screen_resolution: '',
                viewport_size: '',
                connection_type: '',
                connection_speed: '',
                timezone: '',
                timestamp: null
            }
        };

        this.trackerInstances = {
            performanceTracker: null,

            errorTracker: null,
            dataConsumptionTracker: null
        };

        this.updateInterval = null;
        this.isInitialized = false;

        console.log('MetricsDataManager initialized');
    }

    /**
     * Initialize the metrics data manager with tracker instances
     * @param {Object} trackers - Object containing tracker instances
     */
    initialize(trackers = {}) {
        try {
            this.trackerInstances = {
                performanceTracker: trackers.performanceTracker || null,

                errorTracker: trackers.errorTracker || null,
                dataConsumptionTracker: trackers.dataConsumptionTracker || null
            };

            // Initialize session information
            this.metrics.session.start_time = Date.now();
            this.metrics.session.session_id = this.generateSessionId();

            // Initialize user information
            this.initializeUserInformation();

            this.isInitialized = true;
            console.log('MetricsDataManager initialized with trackers');
        } catch (error) {
            console.error('Error initializing MetricsDataManager:', error);
        }
    }

    /**
     * Generate a unique session ID
     * @returns {string} Unique session identifier
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Initialize user information
     */
    initializeUserInformation() {
        try {
            const browserInfo = this.getBrowserInfo();
            const networkInfo = this.getNetworkInfo();

            this.metrics.user = {
                user_agent: navigator.userAgent,
                browser_name: browserInfo.name,
                browser_version: browserInfo.version,
                platform: navigator.platform,
                language: navigator.language,
                screen_resolution: `${screen.width}x${screen.height}`,
                viewport_size: `${window.innerWidth}x${window.innerHeight}`,
                connection_type: networkInfo.effectiveType || 'unknown',
                connection_speed: networkInfo.downlink ? `${networkInfo.downlink} Mbps` : 'unknown',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timestamp: Date.now()
            };

            console.log('User information initialized');
        } catch (error) {
            console.error('Error initializing user information:', error);
        }
    }

    /**
     * Update metrics from a specific category
     * @param {string} category - Metrics category (startup, rebuffering, etc.)
     * @param {Object} data - Metrics data to update
     */
    updateMetrics(category, data) {
        try {
            if (!this.metrics[category]) {
                console.warn(`Unknown metrics category: ${category}`);
                return;
            }

            // Validate and update metrics data
            const validatedData = this.validateMetricsData(category, data);
            this.metrics[category] = { ...this.metrics[category], ...validatedData };

            // Update session current time
            this.metrics.session.current_time = Date.now();
            this.metrics.session.session_duration =
                (this.metrics.session.current_time - this.metrics.session.start_time) / 1000;

        } catch (error) {
            console.error(`Error updating metrics for category ${category}:`, error);
        }
    }

    /**
     * Validate metrics data for consistency and format
     * @param {string} category - Metrics category
     * @param {Object} data - Data to validate
     * @returns {Object} Validated data
     */
    validateMetricsData(category, data) {
        try {
            const validated = {};

            Object.keys(data).forEach(key => {
                const value = data[key];

                // Validate numeric values
                if (typeof value === 'number') {
                    if (isNaN(value) || !isFinite(value)) {
                        console.warn(`Invalid numeric value for ${category}.${key}: ${value}`);
                        validated[key] = 0;
                    } else {
                        // Round to 2 decimal places for consistency
                        validated[key] = Math.round(value * 100) / 100;
                    }
                }
                // Validate arrays
                else if (Array.isArray(value)) {
                    validated[key] = value.slice(); // Create a copy
                }
                // Validate objects
                else if (typeof value === 'object' && value !== null) {
                    validated[key] = { ...value };
                }
                // Other types (string, boolean, null)
                else {
                    validated[key] = value;
                }
            });

            return validated;
        } catch (error) {
            console.error('Error validating metrics data:', error);
            return {};
        }
    }

    /**
     * Collect metrics from all tracker instances
     */
    collectAllMetrics() {
        try {
            // Collect from PerformanceTracker
            if (this.trackerInstances.performanceTracker) {
                const pt = this.trackerInstances.performanceTracker;

                // Startup metrics
                const startupMetrics = pt.getStartupMetrics();
                this.updateMetrics('startup', startupMetrics);

                // Rebuffering metrics
                const rebufferMetrics = pt.getRebufferMetrics();
                this.updateMetrics('rebuffering', rebufferMetrics);

                // Playback metrics
                const playbackMetrics = pt.getPlaybackMetrics();
                this.updateMetrics('playback', playbackMetrics);

                // Frame metrics
                const frameMetrics = pt.getFrameMetrics();
                this.updateMetrics('frames', frameMetrics);

                // FPS metrics
                const fpsMetrics = pt.getFPSMetrics();
                this.updateMetrics('fps', fpsMetrics);

                // Segment metrics
                const segmentMetrics = pt.getSegmentMetrics();
                this.updateMetrics('segments', segmentMetrics);

                // Bitrate metrics
                const bitrateMetrics = pt.getBitrateMetrics();
                // Map average_bitrate to avg_bitrate_played for consistency
                if (bitrateMetrics.average_bitrate) {
                    bitrateMetrics.avg_bitrate_played = bitrateMetrics.average_bitrate;
                }
                console.log('Collecting bitrate metrics:', bitrateMetrics);
                this.updateMetrics('bitrate', bitrateMetrics);
            }

            // Collect from ErrorTracker
            if (this.trackerInstances.errorTracker) {
                const errorMetrics = this.trackerInstances.errorTracker.getErrorMetrics();
                this.updateMetrics('errors', errorMetrics);
            }

            // Collect from DataConsumptionTracker
            if (this.trackerInstances.dataConsumptionTracker) {
                const dataMetrics = this.trackerInstances.dataConsumptionTracker.getDataMetrics();
                this.updateMetrics('data', dataMetrics);
            }

            // Collect bandwidth metrics from PerformanceTracker
            if (this.trackerInstances.performanceTracker && this.trackerInstances.performanceTracker.getBandwidthMetrics) {
                const bandwidthMetrics = this.trackerInstances.performanceTracker.getBandwidthMetrics();
                if (bandwidthMetrics) {
                    this.updateMetrics('bandwidth', bandwidthMetrics);
                }
            }

        } catch (error) {
            console.error('Error collecting metrics from trackers:', error);
        }
    }

    /**
     * Get a complete snapshot of all current metrics
     * @returns {Object} Complete metrics snapshot
     */
    getMetricsSnapshot() {
        try {
            // Collect latest metrics from all trackers
            this.collectAllMetrics();

            // Return a deep copy of all metrics
            return JSON.parse(JSON.stringify(this.metrics));
        } catch (error) {
            console.error('Error getting metrics snapshot:', error);
            return {};
        }
    }

    /**
     * Get structured data ready for server transmission
     * @returns {Object} Server-ready data structure
     */
    getServerReadyData() {
        try {
            const snapshot = this.getMetricsSnapshot();

            // Create server transmission data model
            const serverData = {
                session_id: snapshot.session.session_id,
                timestamp: Date.now(),
                stream_url: snapshot.session.stream_url,
                metrics: {
                    // Startup metrics
                    startup_time: snapshot.startup.startup_time,

                    // Rebuffering metrics
                    rebuffer_count: snapshot.rebuffering.rebuffer_count,
                    rebuffer_duration: snapshot.rebuffering.rebuffer_duration,
                    rebuffer_ratio: snapshot.rebuffering.rebuffer_ratio,

                    // Playback metrics

                    // Frame metrics
                    dropped_frames: snapshot.frames.dropped_frames,
                    total_frames: snapshot.frames.total_frames,
                    dropped_frame_ratio: snapshot.frames.dropped_frame_ratio,

                    // FPS metrics
                    current_fps: snapshot.fps.current_fps,
                    min_fps: snapshot.fps.min_fps,
                    max_fps: snapshot.fps.max_fps,

                    // Bitrate metrics
                    current_bitrate: snapshot.bitrate.current_bitrate,
                    avg_bitrate_played: snapshot.bitrate.avg_bitrate_played,
                    max_bitrate: snapshot.bitrate.max_bitrate,

                    // Bandwidth metrics
                    current_bandwidth: snapshot.bandwidth.current_bandwidth,

                    // Segment metrics
                    max_segment_duration: snapshot.segments.max_segment_duration,
                    min_segment_duration: snapshot.segments.min_segment_duration,
                    avg_segment_load_time: snapshot.segments.avg_segment_load_time,
                    min_segment_loadtime: snapshot.segments.min_segment_loadtime,
                    max_segment_loadtime: snapshot.segments.max_segment_loadtime,

                    // Playlist metrics
                    avg_playlist_reload_time: snapshot.playlist.avg_playlist_reload_time,
                    min_playlist_reload_time: snapshot.playlist.min_playlist_reload_time,
                    max_playlist_reload_time: snapshot.playlist.max_playlist_reload_time,

                    // Error and data metrics
                    error_percentage: snapshot.errors.error_percentage,
                    total_segment_loaded: snapshot.segments.total_segment_loaded,
                    total_data_loaded: snapshot.data.total_data_loaded
                },
                user_info: snapshot.user,
                user_agent: navigator.userAgent,
                browser_info: this.getBrowserInfo(),
                network_info: this.getNetworkInfo()
            };

            return serverData;
        } catch (error) {
            console.error('Error creating server-ready data:', error);
            return null;
        }
    }

    /**
     * Export metrics to JSON format
     * @param {boolean} serverFormat - Whether to use server-ready format
     * @returns {string} JSON string of metrics data
     */
    exportToJSON(serverFormat = false) {
        try {
            const data = serverFormat ? this.getServerReadyData() : this.getMetricsSnapshot();
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exporting to JSON:', error);
            return '{}';
        }
    }

    /**
     * Reset all metrics for a new session
     */
    resetMetrics() {
        try {
            // Reset all metrics to initial state
            this.metrics = {
                startup: { startup_time: null, timestamp: null },
                rebuffering: { rebuffer_count: 0, rebuffer_duration: 0, rebuffer_ratio: 0, last_rebuffer_time: null },
                playback: { watch_time: 0, playback_ratio: 0 },
                frames: { dropped_frames: 0, total_frames: 0, dropped_frame_ratio: 0, last_update: null },
                fps: { current_fps: 0, min_fps: null, max_fps: 0, avg_fps: 0 },
                bitrate: { current_bitrate: 0, avg_bitrate_played: 0, max_bitrate: 0, bitrate_history: [], bitrate_sum: 0, bitrate_count: 0 },
                bandwidth: { current_bandwidth: 0, bandwidth_history: [], last_bandwidth_update: null },
                segments: { max_segment_duration: 0, min_segment_duration: null, avg_segment_load_time: 0, min_segment_loadtime: null, max_segment_loadtime: 0, total_segment_loaded: 0, segment_load_history: [] },
                playlist: { avg_playlist_reload_time: 0, min_playlist_reload_time: null, max_playlist_reload_time: 0, reload_count: 0, reload_history: [] },
                errors: { error_count: 0, total_events: 0, error_percentage: 0, error_types: {}, last_error: null },
                data: { total_data_loaded: 0, data_rate: 0, data_efficiency: 0 },
                session: { start_time: Date.now(), current_time: null, session_duration: 0, stream_url: '', is_live: false, session_id: this.generateSessionId() },
                user: { user_agent: '', browser_name: '', browser_version: '', platform: '', language: '', screen_resolution: '', viewport_size: '', connection_type: '', connection_speed: '', timezone: '', timestamp: null }
            };

            console.log('All metrics reset for new session');
        } catch (error) {
            console.error('Error resetting metrics:', error);
        }
    }

    /**
     * Get browser information for server transmission
     * @returns {Object} Browser information
     */
    getBrowserInfo() {
        try {
            return {
                name: this.getBrowserName(),
                version: this.getBrowserVersion(),
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screen: {
                    width: screen.width,
                    height: screen.height,
                    colorDepth: screen.colorDepth
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };
        } catch (error) {
            console.error('Error getting browser info:', error);
            return {};
        }
    }

    /**
     * Get network information if available
     * @returns {Object} Network information
     */
    getNetworkInfo() {
        try {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

            if (connection) {
                return {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
            }

            return { available: false };
        } catch (error) {
            console.error('Error getting network info:', error);
            return {};
        }
    }

    /**
     * Get browser name from user agent
     * @returns {string} Browser name
     */
    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    /**
     * Get browser version from user agent
     * @returns {string} Browser version
     */
    getBrowserVersion() {
        const userAgent = navigator.userAgent;
        const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
        return match ? match[2] : 'Unknown';
    }

    // Structured data getters for specific metric categories

    /**
     * Get startup metrics
     * @returns {Object} Startup metrics
     */
    getStartupMetrics() {
        return { ...this.metrics.startup };
    }

    /**
     * Get rebuffering metrics
     * @returns {Object} Rebuffering metrics
     */
    getRebufferMetrics() {
        return { ...this.metrics.rebuffering };
    }

    /**
     * Get playback metrics
     * @returns {Object} Playback metrics
     */
    getPlaybackMetrics() {
        return { ...this.metrics.playback };
    }

    /**
     * Get frame metrics
     * @returns {Object} Frame metrics
     */
    getFrameMetrics() {
        return { ...this.metrics.frames };
    }

    /**
     * Get bitrate metrics
     * @returns {Object} Bitrate metrics
     */
    getBitrateMetrics() {
        return { ...this.metrics.bitrate };
    }

    /**
     * Get bandwidth metrics
     * @returns {Object} Bandwidth metrics
     */
    getBandwidthMetrics() {
        return { ...this.metrics.bandwidth };
    }

    /**
     * Get user information
     * @returns {Object} User information
     */
    getUserInformation() {
        return { ...this.metrics.user };
    }

    /**
     * Get segment metrics
     * @returns {Object} Segment metrics
     */
    getSegmentMetrics() {
        return { ...this.metrics.segments };
    }

    /**
     * Get error metrics
     * @returns {Object} Error metrics
     */
    getErrorMetrics() {
        return { ...this.metrics.errors };
    }

    /**
     * Set stream URL for session tracking
     * @param {string} url - Stream URL
     */
    setStreamUrl(url) {
        this.metrics.session.stream_url = url;
    }

    /**
     * Set live stream status
     * @param {boolean} isLive - Whether stream is live
     */
    setLiveStatus(isLive) {
        this.metrics.session.is_live = isLive;
    }

    /**
     * Start real-time data aggregation
     * @param {number} intervalMs - Update interval in milliseconds (default: 5000)
     */
    startRealTimeAggregation(intervalMs = 5000) {
        try {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }

            this.updateInterval = setInterval(() => {
                this.collectAllMetrics();
                console.log('Real-time metrics aggregation updated');
            }, intervalMs);

            console.log(`Real-time data aggregation started with ${intervalMs}ms interval`);
        } catch (error) {
            console.error('Error starting real-time aggregation:', error);
        }
    }

    /**
     * Stop real-time data aggregation
     */
    stopRealTimeAggregation() {
        try {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
                console.log('Real-time data aggregation stopped');
            }
        } catch (error) {
            console.error('Error stopping real-time aggregation:', error);
        }
    }

    /**
     * Export metrics data in various formats
     * @param {string} format - Export format ('json', 'csv', 'xml')
     * @param {boolean} serverFormat - Whether to use server-ready format
     * @returns {string} Formatted data string
     */
    exportData(format = 'json', serverFormat = false) {
        try {
            const data = serverFormat ? this.getServerReadyData() : this.getMetricsSnapshot();

            switch (format.toLowerCase()) {
                case 'json':
                    return this.exportToJSON(serverFormat);

                case 'csv':
                    return this.exportToCSV(data);

                case 'xml':
                    return this.exportToXML(data);

                default:
                    console.warn(`Unsupported export format: ${format}, defaulting to JSON`);
                    return this.exportToJSON(serverFormat);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            return '';
        }
    }

    /**
     * Export metrics to CSV format
     * @param {Object} data - Metrics data to export
     * @returns {string} CSV formatted string
     */
    exportToCSV(data) {
        try {
            const flatData = this.flattenObject(data);
            const headers = Object.keys(flatData);
            const values = Object.values(flatData);

            let csv = headers.join(',') + '\n';
            csv += values.map(value => {
                // Handle strings with commas by wrapping in quotes
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',');

            return csv;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return '';
        }
    }

    /**
     * Export metrics to XML format
     * @param {Object} data - Metrics data to export
     * @returns {string} XML formatted string
     */
    exportToXML(data) {
        try {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<metrics>\n';
            xml += this.objectToXML(data, 1);
            xml += '</metrics>';
            return xml;
        } catch (error) {
            console.error('Error exporting to XML:', error);
            return '';
        }
    }

    /**
     * Convert object to XML recursively
     * @param {Object} obj - Object to convert
     * @param {number} indent - Indentation level
     * @returns {string} XML string
     */
    objectToXML(obj, indent = 0) {
        let xml = '';
        const indentStr = '  '.repeat(indent);

        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                xml += `${indentStr}<${key} />\n`;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                xml += `${indentStr}<${key}>\n`;
                xml += this.objectToXML(value, indent + 1);
                xml += `${indentStr}</${key}>\n`;
            } else if (Array.isArray(value)) {
                xml += `${indentStr}<${key}>\n`;
                value.forEach((item, index) => {
                    xml += `${indentStr}  <item index="${index}">${item}</item>\n`;
                });
                xml += `${indentStr}</${key}>\n`;
            } else {
                xml += `${indentStr}<${key}>${value}</${key}>\n`;
            }
        }

        return xml;
    }

    /**
     * Flatten nested object for CSV export
     * @param {Object} obj - Object to flatten
     * @param {string} prefix - Key prefix for nested properties
     * @returns {Object} Flattened object
     */
    flattenObject(obj, prefix = '') {
        const flattened = {};

        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (value === null || value === undefined) {
                flattened[newKey] = '';
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(flattened, this.flattenObject(value, newKey));
            } else if (Array.isArray(value)) {
                flattened[newKey] = JSON.stringify(value);
            } else {
                flattened[newKey] = value;
            }
        }

        return flattened;
    }

    /**
     * Send metrics data to server endpoint
     * @param {string} endpoint - Server endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise} Fetch promise
     */
    async transmitToServer(endpoint, options = {}) {
        try {
            const serverData = this.getServerReadyData();

            if (!serverData) {
                throw new Error('Failed to prepare server data');
            }

            const defaultOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(serverData)
            };

            const requestOptions = { ...defaultOptions, ...options };

            console.log('Transmitting metrics to server:', endpoint);
            const response = await fetch(endpoint, requestOptions);

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Metrics successfully transmitted to server');
            return result;

        } catch (error) {
            console.error('Error transmitting metrics to server:', error);
            throw error;
        }
    }

    /**
     * Batch transmit multiple metrics snapshots
     * @param {string} endpoint - Server endpoint URL
     * @param {Array} snapshots - Array of metrics snapshots
     * @param {Object} options - Request options
     * @returns {Promise} Fetch promise
     */
    async batchTransmitToServer(endpoint, snapshots, options = {}) {
        try {
            const batchData = {
                batch_id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                count: snapshots.length,
                snapshots: snapshots
            };

            const defaultOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(batchData)
            };

            const requestOptions = { ...defaultOptions, ...options };

            console.log(`Batch transmitting ${snapshots.length} metrics snapshots to server:`, endpoint);
            const response = await fetch(endpoint, requestOptions);

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Batch metrics successfully transmitted to server');
            return result;

        } catch (error) {
            console.error('Error batch transmitting metrics to server:', error);
            throw error;
        }
    }

    /**
     * Download metrics data as a file
     * @param {string} format - File format ('json', 'csv', 'xml')
     * @param {string} filename - Optional filename
     * @param {boolean} serverFormat - Whether to use server-ready format
     */
    downloadMetricsFile(format = 'json', filename = null, serverFormat = false) {
        try {
            const data = this.exportData(format, serverFormat);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultFilename = `hls-metrics-${timestamp}.${format}`;
            const finalFilename = filename || defaultFilename;

            // Create blob and download
            const mimeTypes = {
                json: 'application/json',
                csv: 'text/csv',
                xml: 'application/xml'
            };

            const blob = new Blob([data], { type: mimeTypes[format] || 'text/plain' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = finalFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the URL object
            setTimeout(() => URL.revokeObjectURL(url), 100);

            console.log(`Metrics file downloaded: ${finalFilename}`);
        } catch (error) {
            console.error('Error downloading metrics file:', error);
        }
    }

    /**
     * Create a metrics summary report
     * @returns {Object} Summary report with key insights
     */
    createSummaryReport() {
        try {
            const snapshot = this.getMetricsSnapshot();

            const report = {
                session_info: {
                    session_id: snapshot.session.session_id,
                    duration: snapshot.session.session_duration,
                    stream_url: snapshot.session.stream_url,
                    is_live: snapshot.session.is_live,
                    timestamp: new Date().toISOString()
                },
                performance_summary: {
                    startup_time: snapshot.startup.startup_time,
                    rebuffering_events: snapshot.rebuffering.rebuffer_count,
                    rebuffering_ratio: snapshot.rebuffering.rebuffer_ratio,
                    playback_efficiency: snapshot.playback.playback_ratio,
                    frame_drop_ratio: snapshot.frames.dropped_frame_ratio,
                    average_fps: snapshot.fps.avg_fps,
                    average_bitrate: snapshot.bitrate.avg_bitrate_played,
                    error_rate: snapshot.errors.error_percentage
                },
                quality_assessment: {
                    overall_score: this.calculateOverallQualityScore(snapshot),
                    startup_grade: this.gradeStartupPerformance(snapshot.startup.startup_time),
                    rebuffering_grade: this.gradeRebufferingPerformance(snapshot.rebuffering.rebuffer_ratio),
                    bitrate_stability: this.assessBitrateStability(snapshot.bitrate.bitrate_history),
                    recommendations: this.generateRecommendations(snapshot)
                },
                data_consumption: {
                    total_data_gb: snapshot.data.total_data_loaded,
                    data_efficiency: snapshot.data.data_efficiency,
                    segments_loaded: snapshot.segments.total_segment_loaded
                }
            };

            return report;
        } catch (error) {
            console.error('Error creating summary report:', error);
            return {};
        }
    }

    /**
     * Calculate overall quality score (0-100)
     * @param {Object} snapshot - Metrics snapshot
     * @returns {number} Quality score
     */
    calculateOverallQualityScore(snapshot) {
        try {
            let score = 100;

            // Deduct points for startup time
            if (snapshot.startup.startup_time > 5000) score -= 20;
            else if (snapshot.startup.startup_time > 3000) score -= 10;
            else if (snapshot.startup.startup_time > 1000) score -= 5;

            // Deduct points for rebuffering
            if (snapshot.rebuffering.rebuffer_ratio > 10) score -= 30;
            else if (snapshot.rebuffering.rebuffer_ratio > 5) score -= 20;
            else if (snapshot.rebuffering.rebuffer_ratio > 2) score -= 10;

            // Deduct points for frame drops
            if (snapshot.frames.dropped_frame_ratio > 5) score -= 15;
            else if (snapshot.frames.dropped_frame_ratio > 2) score -= 10;
            else if (snapshot.frames.dropped_frame_ratio > 1) score -= 5;

            // Deduct points for errors
            if (snapshot.errors.error_percentage > 5) score -= 20;
            else if (snapshot.errors.error_percentage > 2) score -= 10;
            else if (snapshot.errors.error_percentage > 0) score -= 5;

            return Math.max(0, Math.min(100, score));
        } catch (error) {
            console.error('Error calculating quality score:', error);
            return 0;
        }
    }

    /**
     * Grade startup performance
     * @param {number} startupTime - Startup time in milliseconds
     * @returns {string} Performance grade
     */
    gradeStartupPerformance(startupTime) {
        if (startupTime === null) return 'N/A';
        if (startupTime < 1000) return 'A';
        if (startupTime < 3000) return 'B';
        if (startupTime < 5000) return 'C';
        return 'D';
    }

    /**
     * Grade rebuffering performance
     * @param {number} rebufferRatio - Rebuffering ratio percentage
     * @returns {string} Performance grade
     */
    gradeRebufferingPerformance(rebufferRatio) {
        if (rebufferRatio === 0) return 'A';
        if (rebufferRatio < 2) return 'B';
        if (rebufferRatio < 5) return 'C';
        return 'D';
    }

    /**
     * Assess bitrate stability
     * @param {Array} bitrateHistory - Bitrate change history
     * @returns {string} Stability assessment
     */
    assessBitrateStability(bitrateHistory) {
        if (!bitrateHistory || bitrateHistory.length < 2) return 'Stable';
        if (bitrateHistory.length < 5) return 'Stable';
        if (bitrateHistory.length < 10) return 'Moderate';
        return 'Variable';
    }

    /**
     * Generate performance recommendations
     * @param {Object} snapshot - Metrics snapshot
     * @returns {Array} Array of recommendation strings
     */
    generateRecommendations(snapshot) {
        const recommendations = [];

        if (snapshot.startup.startup_time > 3000) {
            recommendations.push('Consider optimizing stream startup time - current time exceeds 3 seconds');
        }

        if (snapshot.rebuffering.rebuffer_ratio > 5) {
            recommendations.push('High rebuffering detected - check network conditions or reduce bitrate');
        }

        if (snapshot.frames.dropped_frame_ratio > 2) {
            recommendations.push('Frame drops detected - check device performance or reduce video quality');
        }

        if (snapshot.errors.error_percentage > 2) {
            recommendations.push('Error rate is elevated - investigate stream stability and network issues');
        }

        if (snapshot.bitrate.bitrate_history && snapshot.bitrate.bitrate_history.length > 10) {
            recommendations.push('Frequent bitrate changes detected - network conditions may be unstable');
        }

        if (recommendations.length === 0) {
            recommendations.push('Stream performance is good - no major issues detected');
        }

        return recommendations;
    }

    /**
     * Validate data structure consistency with server API requirements
     * @param {Object} data - Data to validate
     * @returns {boolean} Whether data is consistent with API requirements
     */
    validateServerAPIConsistency(data) {
        try {
            const requiredFields = [
                'session_id', 'timestamp', 'stream_url', 'metrics',
                'user_agent', 'browser_info', 'network_info'
            ];

            const requiredMetrics = [
                'startup_time', 'rebuffer_count', 'rebuffer_duration', 'rebuffer_ratio',
                'dropped_frames', 'total_frames', 'dropped_frame_ratio',
                'current_fps', 'min_fps', 'max_fps', 'current_bitrate', 'avg_bitrate_played',
                'current_bandwidth', 'max_segment_duration', 'min_segment_duration',
                'avg_segment_load_time', 'min_segment_loadtime', 'max_segment_loadtime',
                'avg_playlist_reload_time', 'min_playlist_reload_time', 'max_playlist_reload_time',
                'error_percentage', 'total_segment_loaded', 'total_data_loaded'
            ];

            // Check required top-level fields
            for (const field of requiredFields) {
                if (!(field in data)) {
                    console.warn(`Missing required field: ${field}`);
                    return false;
                }
            }

            // Check required metrics fields
            if (data.metrics) {
                for (const metric of requiredMetrics) {
                    if (!(metric in data.metrics)) {
                        console.warn(`Missing required metric: ${metric}`);
                        return false;
                    }
                }
            }

            console.log('Data structure is consistent with server API requirements');
            return true;
        } catch (error) {
            console.error('Error validating server API consistency:', error);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.stopRealTimeAggregation();

            this.trackerInstances = {};
            this.isInitialized = false;

            console.log('MetricsDataManager cleaned up');
        } catch (error) {
            console.error('Error during MetricsDataManager cleanup:', error);
        }
    }
}