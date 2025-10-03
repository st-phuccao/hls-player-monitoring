/**
 * MemoryManager - Quản lý bộ nhớ và cleanup resources
 */
export default class MemoryManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.eventListeners = new Map();
        this.observers = new Set();
    }

    /**
     * Thêm interval để theo dõi
     */
    addInterval(id) {
        this.intervals.add(id);
        return id;
    }

    /**
     * Thêm timeout để theo dõi
     */
    addTimeout(id) {
        this.timeouts.add(id);
        return id;
    }

    /**
     * Thêm event listener và theo dõi để cleanup
     */
    addEventListener(element, event, handler) {
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, new Map());
        }
        this.eventListeners.get(element).set(event, handler);
        element.addEventListener(event, handler);
    }

    /**
     * Thêm observer để theo dõi
     */
    addObserver(observer) {
        this.observers.add(observer);
        return observer;
    }

    /**
     * Cleanup tất cả resources
     */
    cleanup() {
        try {
            // Clear intervals
            this.intervals.forEach(id => {
                try {
                    clearInterval(id);
                } catch (error) {
                    console.warn('Error clearing interval:', error);
                }
            });
            this.intervals.clear();

            // Clear timeouts
            this.timeouts.forEach(id => {
                try {
                    clearTimeout(id);
                } catch (error) {
                    console.warn('Error clearing timeout:', error);
                }
            });
            this.timeouts.clear();

            // Remove event listeners
            this.eventListeners.forEach((events, element) => {
                events.forEach((handler, event) => {
                    try {
                        element.removeEventListener(event, handler);
                    } catch (error) {
                        console.warn('Error removing event listener:', error);
                    }
                });
            });
            this.eventListeners.clear();

            // Disconnect observers
            this.observers.forEach(observer => {
                try {
                    if (observer && typeof observer.disconnect === 'function') {
                        observer.disconnect();
                    }
                } catch (error) {
                    console.warn('Error disconnecting observer:', error);
                }
            });
            this.observers.clear();

            console.log('Memory cleanup completed');
        } catch (error) {
            console.error('Error during memory cleanup:', error);
        }
    }

    /**
     * Lấy thông tin memory usage hiện tại
     */
    getMemoryUsage() {
        if (performance && performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * Log memory statistics
     */
    logMemoryStats() {
        const memory = this.getMemoryUsage();
        console.log('Memory Manager Stats:', {
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            eventListeners: this.eventListeners.size,
            observers: this.observers.size,
            memory: memory ? `${memory.used}MB / ${memory.total}MB` : 'N/A'
        });
    }
}
