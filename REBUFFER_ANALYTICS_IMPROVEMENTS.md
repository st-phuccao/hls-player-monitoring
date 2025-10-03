# Cải Tiến Rebuffering Analytics Theo Nguyên Tắc Chuẩn

## Tổng Quan Thay Đổi

Đã cải tiến hệ thống rebuffering analytics để tuân thủ nguyên tắc chuẩn trong ngành, với focus vào độ chính xác và loại trừ false-positive.

## Nguyên Tắc Chuẩn Được Áp Dụng

### 1. Định Nghĩa Rebuffer Chính Xác
- **Rebuffer chỉ tính khi**: đang play bình thường mà video hết data → player phải dừng lại đợi buffer
- **Khác với**: pause (user action), seek (user action), startup delay (lần đầu load)

### 2. Event-Based Detection
**Bắt đầu rebuffer** khi có event `waiting` hoặc `stalled` và:
- `!video.paused` (không phải user pause)
- `!video.seeking` (không phải user seek)  
- `video.readyState < HAVE_FUTURE_DATA` (< 3) (thực sự thiếu data)

**Kết thúc rebuffer** khi:
- Event `playing` được trigger
- Hoặc `timeupdate` thấy `currentTime` tăng trở lại

### 3. Loại Trừ False-Positive
- **Startup**: Lần `waiting` trước khi `playing` đầu tiên → không tính rebuffer
- **Seek**: Khoảng chờ do seeking/seeked → không tính rebuffer  
- **Pause**: User pause → không tính
- **Stall ngắn**: Bỏ qua stall < 250ms để tránh false-positive (đặc biệt LL-HLS)

### 4. Watch Time Chuẩn
- **Watch time** = tổng thời gian đang phát (not paused, not seeking, not stalled)
- **Preserve khi rời tab**: Watch time được checkpoint và resume, không reset
- **Tính liên tục**: Sử dụng `timeupdate` event để update real-time

## Thay Đổi Kỹ Thuật

### PerformanceTracker.js
1. **Thêm event-based detection**:
   ```javascript
   attachVideoElement(videoElement) // Public method để attach video
   setupVideoEventListeners() // Setup các event listeners chuẩn
   onVideoWaiting() // Handle waiting event với validation
   onVideoPlaying() // Handle playing event  
   onVideoTimeUpdate() // Handle timeupdate để detect progress
   ```

2. **Thêm state tracking**:
   ```javascript
   is_first_playing: true // Track startup vs rebuffer
   min_rebuffer_duration: 250 // ms - bỏ qua stall ngắn
   watch_time_accumulated: 0 // Tích lũy watch time
   isWaitingForBuffer: false // Current rebuffer state
   ```

3. **Cải tiến watch time**:
   ```javascript
   checkpointWatchTime() // Lưu watch time khi pause/hide tab
   resumeWatchTime() // Resume từ checkpoint
   onVisibilityChange() // Handle tab visibility change
   ```

### HLSPlayer.js
1. **Integration với event-based system**:
   ```javascript
   setPerformanceTracker(tracker) {
       // Tự động attach video element
       tracker.attachVideoElement(this.videoElement);
   }
   ```

2. **Loại bỏ manual rebuffer calls**:
   - Không còn gọi `onBufferStall()` và `onBufferResume()` manually
   - HLS events chỉ dùng cho logging, không trigger rebuffer detection

### app.js
1. **Sử dụng attachVideoElement**:
   ```javascript
   performanceTracker.attachVideoElement(videoElement);
   ```

2. **Loại bỏ manual event handling**:
   - Video events chỉ dùng cho error tracking
   - Rebuffer detection hoàn toàn tự động

## Tính Năng Mới

### 1. Configuration API
```javascript
// Get current config
const config = performanceTracker.getRebufferConfig();

// Update config  
performanceTracker.updateRebufferConfig({
    minRebufferDuration: 500 // ms
});
```

### 2. Enhanced Display
- Hiển thị detection mode: "Event-based"
- Hiển thị min duration threshold
- Status indicators cho startup vs rebuffering
- Tooltip với detailed info

### 3. Visibility Change Handling
- Watch time được preserve khi user rời tab
- Automatic checkpoint/resume system
- Không bị reset watch time khi switch tab

## Test File

Tạo `test-rebuffer-logic.html` để test các scenario:
- Normal playback
- Seek operations  
- Network issues simulation
- Tab visibility changes
- Different min duration thresholds

## Backward Compatibility

- Các method cũ (`onBufferStall`, `onBufferResume`) vẫn hoạt động nhưng deprecated
- Hiển thị warning khi sử dụng method cũ
- Tự động fallback cho compatibility

## Kết Quả

1. **Độ chính xác cao hơn**: Loại trừ được false-positive từ seek, pause, startup
2. **Watch time chuẩn**: Không bị reset khi rời tab, tính đúng thời gian thực tế xem
3. **Performance tốt hơn**: Event-based thay vì polling
4. **Tuân thủ industry standard**: Theo nguyên tắc của các platform lớn như YouTube, Netflix

## Sử Dụng

```javascript
// Initialize
const tracker = new PerformanceTracker();

// Attach video element (required for event-based detection)
tracker.attachVideoElement(videoElement);

// Start tracking
tracker.startWatchTime();

// Get metrics
const metrics = tracker.getRebufferMetrics();
console.log(`Rebuffer ratio: ${metrics.rebuffer_ratio.toFixed(2)}%`);
```