/**
 * Debug script for Data Consumption Tracker
 * Chạy script này trong console để debug data consumption tracking
 */

// Function để test tất cả các method tracking
function debugDataConsumptionDetailed() {
    console.log('🔍 DETAILED DATA CONSUMPTION DEBUG');
    console.log('=====================================');

    // 1. Kiểm tra trạng thái cơ bản
    console.log('1. Basic Status Check:');
    if (typeof dataConsumptionTracker !== 'undefined' && dataConsumptionTracker) {
        const debugInfo = dataConsumptionTracker.getDebugInfo();
        console.log('   ✅ DataConsumptionTracker exists');
        console.log('   📊 Debug Info:', debugInfo);

        // 2. Kiểm tra HLS instance
        console.log('\n2. HLS Instance Check:');
        if (debugInfo.hasHLSInstance) {
            console.log('   ✅ HLS Instance connected');
            if (typeof hlsPlayer !== 'undefined' && hlsPlayer) {
                console.log('   📺 HLS Player levels:', hlsPlayer.levels?.length || 0);
                console.log('   📺 Current level:', hlsPlayer.currentLevel);
                console.log('   📺 Auto level:', hlsPlayer.autoLevelEnabled);
            }
        } else {
            console.log('   ❌ No HLS Instance');
        }

        // 3. Kiểm tra Video Element
        console.log('\n3. Video Element Check:');
        if (typeof videoElement !== 'undefined' && videoElement) {
            console.log('   ✅ Video Element exists');
            console.log('   📹 Video src:', videoElement.src ? 'Set' : 'Not set');
            console.log('   📹 Video duration:', videoElement.duration);
            console.log('   📹 Video buffered ranges:', videoElement.buffered?.length || 0);

            // Tính tổng buffer
            let totalBuffered = 0;
            if (videoElement.buffered) {
                for (let i = 0; i < videoElement.buffered.length; i++) {
                    totalBuffered += videoElement.buffered.end(i) - videoElement.buffered.start(i);
                }
            }
            console.log('   📹 Total buffered time:', totalBuffered.toFixed(2), 'seconds');
        } else {
            console.log('   ❌ No Video Element');
        }

        // 4. Test network interception
        console.log('\n4. Network Interception Test:');
        console.log('   🌐 Testing XMLHttpRequest override...');
        const testXHR = new XMLHttpRequest();
        console.log('   🌐 XMLHttpRequest type:', typeof testXHR);

        // 5. Simulate data loading
        console.log('\n5. Simulating Data Loading:');
        const beforeBytes = debugInfo.metrics.bytes_loaded;
        dataConsumptionTracker.simulateDataLoading();
        const afterDebugInfo = dataConsumptionTracker.getDebugInfo();
        const afterBytes = afterDebugInfo.metrics.bytes_loaded;
        console.log('   📈 Before:', (beforeBytes / 1024 / 1024).toFixed(2), 'MB');
        console.log('   📈 After:', (afterBytes / 1024 / 1024).toFixed(2), 'MB');
        console.log('   📈 Difference:', ((afterBytes - beforeBytes) / 1024 / 1024).toFixed(2), 'MB');

        // 6. Force update display
        console.log('\n6. Forcing Display Update:');
        dataConsumptionTracker.updateDataDisplay();
        console.log('   🔄 Display update completed');

        // 7. Check panel existence
        console.log('\n7. Panel Existence Check:');
        const panel = document.getElementById('dataConsumptionPanel');
        if (panel) {
            console.log('   ✅ Data Consumption Panel exists');
            const totalDataElement = panel.querySelector('#totalDataValue');
            const dataRateElement = panel.querySelector('#dataRateValue');
            const statusElement = panel.querySelector('#dataStatus');

            console.log('   📊 Total Data Display:', totalDataElement?.textContent || 'Not found');
            console.log('   📊 Data Rate Display:', dataRateElement?.textContent || 'Not found');
            console.log('   📊 Status Display:', statusElement?.textContent || 'Not found');
        } else {
            console.log('   ❌ Data Consumption Panel not found');
            console.log('   🔧 Attempting to create panel...');
            dataConsumptionTracker.createDataPanel();
            dataConsumptionTracker.updateDataDisplay();
        }

    } else {
        console.log('   ❌ DataConsumptionTracker not found');
        console.log('   🔧 Available global objects:', Object.keys(window).filter(key => key.includes('data') || key.includes('tracker')));
    }

    console.log('\n=====================================');
    console.log('🏁 DEBUG COMPLETE');
}

// Function để monitor data consumption real-time
function startDataConsumptionMonitoring(intervalMs = 5000) {
    console.log('🔄 Starting real-time data consumption monitoring...');

    return setInterval(() => {
        if (typeof dataConsumptionTracker !== 'undefined' && dataConsumptionTracker) {
            const metrics = dataConsumptionTracker.getDataMetrics();
            console.log('📊 Real-time Data Metrics:', {
                totalGB: metrics.total_data_loaded.toFixed(3),
                rateMBps: metrics.data_rate.toFixed(2),
                efficiencyMBmin: metrics.data_efficiency.toFixed(2),
                bytesLoaded: (metrics.bytes_loaded / 1024 / 1024).toFixed(2) + ' MB'
            });
        }
    }, intervalMs);
}

// Function để test với stream thật
function testWithRealStream() {
    console.log('🎬 Testing with real stream...');

    if (typeof videoElement !== 'undefined' && videoElement && videoElement.src) {
        console.log('   📺 Video has source, attempting to play...');

        const playPromise = videoElement.play();
        if (playPromise) {
            playPromise.then(() => {
                console.log('   ✅ Video playing, monitoring data...');

                // Monitor for 30 seconds
                let count = 0;
                const monitor = setInterval(() => {
                    count++;
                    if (dataConsumptionTracker) {
                        const metrics = dataConsumptionTracker.getDataMetrics();
                        console.log(`   📊 [${count}] Data: ${(metrics.bytes_loaded / 1024 / 1024).toFixed(2)} MB, Rate: ${metrics.data_rate.toFixed(2)} MB/s`);
                    }

                    if (count >= 6) { // 30 seconds
                        clearInterval(monitor);
                        console.log('   🏁 Monitoring complete');
                    }
                }, 5000);

            }).catch(error => {
                console.log('   ❌ Play failed:', error);
            });
        }
    } else {
        console.log('   ❌ No video source available');
        console.log('   💡 Load a stream first using the "Load Stream" button');
    }
}

// Export functions to global scope
window.debugDataConsumptionDetailed = debugDataConsumptionDetailed;
window.startDataConsumptionMonitoring = startDataConsumptionMonitoring;
window.testWithRealStream = testWithRealStream;

console.log('🛠️ Data Consumption Debug Tools Loaded');
console.log('Available functions:');
console.log('  - debugDataConsumptionDetailed()');
console.log('  - startDataConsumptionMonitoring(intervalMs)');
console.log('  - testWithRealStream()');