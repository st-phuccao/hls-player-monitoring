// Script để clean up PerformanceTracker - xóa tất cả playback methods
// Chạy script này để tạo version clean của PerformanceTracker

const fs = require('fs');

// Đọc file hiện tại
const filePath = 'js/core/PerformanceTracker.js';
let content = fs.readFileSync(filePath, 'utf8');

// Danh sách các method cần xóa
const methodsToRemove = [
    'resumePlaybackTimer',
    'onBufferingStart',
    'onBufferingEnd',
    'startPlaybackUpdates',
    'stopPlaybackUpdates',
    'updatePlaybackMetrics',
    'updatePlaybackDisplay',
    'getPlaybackMetrics'
];

// Xóa từng method
methodsToRemove.forEach(methodName => {
    // Pattern để match method từ comment đến method tiếp theo
    const methodPattern = new RegExp(
        `\\s*\\/\\*\\*[\\s\\S]*?\\*\\/\\s*${methodName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?(?=\\s*\\/\\*\\*|\\s*[a-zA-Z_$][a-zA-Z0-9_$]*\\s*\\(|$)`,
        'g'
    );

    content = content.replace(methodPattern, '');
    console.log(`Removed method: ${methodName}`);
});

// Xóa các reference đến playback metrics
content = content.replace(/this\.metrics\.playback[^;]*;/g, '');
content = content.replace(/\.playback\./g, '.');

// Xóa các comment về playback
content = content.replace(/\/\/.*playback.*\n/gi, '');
content = content.replace(/\/\*.*playback.*\*\//gi, '');

// Clean up multiple empty lines
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// Ghi lại file
fs.writeFileSync(filePath, content);
console.log('PerformanceTracker cleaned up successfully!');