# Kế hoạch Triển khai - Chức năng Hình trong Hình

- [ ] 1. Tạo PiPController core class
  - Tạo file `js/core/PiPController.js` với class chính quản lý Picture-in-Picture
  - Implement các phương thức cơ bản: `isPiPSupported()`, `enterPictureInPicture()`, `exitPictureInPicture()`
  - Thêm event handling cho PiP state changes
  - _Yêu cầu: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Tích hợp PiP detection và UI controls
  - Mở rộng UIManager để thêm PiP button vào video controls
  - Implement logic hiển thị/ẩn nút PiP dựa trên browser support
  - Thêm CSS styling cho PiP button với icons phù hợp
  - Tạo tooltip và accessibility labels cho PiP controls
  - _Yêu cầu: 4.1, 4.2, 5.1_

- [ ] 3. Implement PiP activation và deactivation logic
  - Code logic kích hoạt PiP khi user click button hoặc keyboard shortcut
  - Implement smooth transition effects khi enter/exit PiP mode
  - Thêm validation để đảm bảo chỉ một PiP window active tại một thời điểm
  - Handle user gesture requirements cho PiP API
  - _Yêu cầu: 1.1, 1.2, 4.2, 5.4_

- [ ] 4. Tích hợp với HLSPlayer để maintain video state
  - Mở rộng HLSPlayer class để support PiP state management
  - Đảm bảo video quality và stream continuity trong PiP mode
  - Implement logic để sync video state giữa main player và PiP window
  - _Yêu cầu: 3.1, 3.2, 3.3_

- [ ] 5. Implement PiP window controls và interactions
  - Thêm play/pause controls trong PiP window
  - Implement close button functionality trong PiP window
  - Code logic để handle PiP window resize và repositioning
  - Đảm bảo controls accessibility trong PiP mode
  - _Yêu cầu: 2.1, 2.2, 2.3, 2.4_

- [ ] 6. Thêm keyboard shortcuts support
  - Mở rộng UIManager keyboard shortcuts để include PiP toggle (phím P)
  - Implement keyboard navigation trong PiP mode
  - Thêm PiP shortcuts vào keyboard help panel
  - Test keyboard accessibility với screen readers
  - _Yêu cầu: 4.1, 4.4_

- [ ] 7. Implement comprehensive error handling
  - Tạo error handling strategies cho các PiP API errors
  - Implement graceful fallback khi browser không support PiP
  - Thêm user-friendly error messages và notifications
  - Code automatic recovery logic khi PiP bị interrupted
  - _Yêu cầu: 5.1, 5.2, 5.3_

- [ ] 8. Tích hợp PiP metrics với PerformanceTracker
  - Mở rộng PerformanceTracker để track PiP usage metrics
  - Implement logging cho PiP activation/deactivation events
  - Thêm PiP session duration tracking
  - Code metrics cho PiP error rates và success rates
  - _Yêu cầu: 3.2_

- [ ] 10. Accessibility enhancements và screen reader support
  - Implement ARIA labels và announcements cho PiP state changes
  - Thêm live region updates khi enter/exit PiP mode
  - Code proper focus management khi switching giữa main và PiP
  - Test với screen readers và keyboard-only navigation
  - _Yêu cầu: 4.3, 4.4_

- [ ] 11. Integration testing với existing components
  - Viết integration tests cho PiP với HLSPlayer
  - Test PiP functionality với different video formats và streams
  - Verify memory management và cleanup khi exit PiP
  - Test PiP với existing error handling và recovery mechanisms
  - _Yêu cầu: 3.1, 3.3, 3.4_

- [ ] 12. Final UI polish và user experience improvements
  - Fine-tune PiP window sizing và positioning logic
  - Implement smooth animations cho PiP transitions
  - Optimize PiP button placement và visibility
  - Add configuration options cho PiP behavior customization
  - _Yêu cầu: 4.2, 4.3_