/**
 * UIManager - Quản lý giao diện người dùng và các tương tác hỗ trợ accessibility
 */
export default class UIManager {
    constructor(memoryManager, options = {}) {
        this.memoryManager = memoryManager;
        this.keyboardShortcuts = new Map();
        this.accessibleCallbacks = {
            onError: options.onAccessibleError || null,
            onSuccess: options.onAccessibleSuccess || null
        };

        this.liveRegion = null;
        this.keyboardHelpPanel = null;
        this.lastFocusedElement = null;

        this.initializeUI();
    }

    /**
     * Cho phép thiết lập callback cho thông báo accessibility sau khi khởi tạo
     */
    setAccessibleCallbacks({ onError, onSuccess } = {}) {
        if (onError) {
            this.accessibleCallbacks.onError = onError;
        }
        if (onSuccess) {
            this.accessibleCallbacks.onSuccess = onSuccess;
        }
    }

    /**
     * Khởi tạo các thành phần giao diện chính
     */
    initializeUI() {
        this.initializeKeyboardShortcuts();
        this.initializeAccessibilityFeatures();
        this.initializeCustomControls();
    }

    /**
     * Khởi tạo keyboard shortcuts cho video player
     */
    initializeKeyboardShortcuts() {
        try {
            this.keyboardShortcuts.set('Space', () => {
                const videoElement = document.getElementById('videoPlayer');
                if (!videoElement) return;

                if (videoElement.paused) {
                    videoElement.play();
                } else {
                    videoElement.pause();
                }
            });

            this.keyboardShortcuts.set('KeyF', () => {
                const videoElement = document.getElementById('videoPlayer');
                if (!videoElement) return;

                if (!document.fullscreenElement) {
                    this.requestFullscreen(videoElement.parentElement);
                    this.announceToScreenReader('Entered fullscreen mode');
                } else {
                    this.exitFullscreen();
                    this.announceToScreenReader('Exited fullscreen mode');
                }
            });

            this.keyboardShortcuts.set('KeyM', () => {
                const videoElement = document.getElementById('videoPlayer');
                if (videoElement) {
                    videoElement.muted = !videoElement.muted;
                    this.updateMuteButton();
                }
            });

            this.keyboardShortcuts.set('ArrowUp', () => {
                const videoElement = document.getElementById('videoPlayer');
                if (videoElement) {
                    videoElement.volume = Math.min(1, videoElement.volume + 0.1);
                }
            });

            this.keyboardShortcuts.set('ArrowDown', () => {
                const videoElement = document.getElementById('videoPlayer');
                if (videoElement) {
                    videoElement.volume = Math.max(0, videoElement.volume - 0.1);
                }
            });

            this.keyboardShortcuts.set('KeyR', () => {
                const streamUrlInput = document.getElementById('streamUrl');
                if (streamUrlInput && streamUrlInput.value.trim()) {
                    const event = new CustomEvent('reloadStream');
                    document.dispatchEvent(event);
                }
            });

            this.keyboardShortcuts.set('Escape', () => {
                if (document.fullscreenElement) {
                    this.exitFullscreen();
                    this.announceToScreenReader('Exited fullscreen mode');
                } else {
                    this.closeKeyboardHelp();
                }
            });

            this.keyboardShortcuts.set('Slash', () => {
                this.toggleKeyboardHelp();
            });

            this.keyboardShortcuts.set('Question', () => {
                this.toggleKeyboardHelp();
            });

            const keyboardHandler = (event) => {
                if (event.target.tagName === 'INPUT' ||
                    event.target.tagName === 'TEXTAREA' ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.metaKey) {
                    return;
                }

                let keyCode = event.code;
                if (event.key === '?' && event.shiftKey) {
                    keyCode = 'Question';
                } else if (event.key === '/' && !event.shiftKey) {
                    keyCode = 'Slash';
                }

                const shortcut = this.keyboardShortcuts.get(keyCode);
                if (shortcut) {
                    event.preventDefault();
                    try {
                        shortcut();
                    } catch (error) {
                        console.error('Error executing keyboard shortcut:', error);
                    }
                }
            };

            this.memoryManager.addEventListener(document, 'keydown', keyboardHandler);
            console.log('Keyboard shortcuts initialized');
        } catch (error) {
            console.error('Failed to initialize keyboard shortcuts:', error);
        }
    }

    /**
     * Khởi tạo các thành phần hỗ trợ accessibility
     */
    initializeAccessibilityFeatures() {
        try {
            if (!this.liveRegion) {
                this.liveRegion = document.createElement('div');
                this.liveRegion.setAttribute('aria-live', 'polite');
                this.liveRegion.setAttribute('aria-atomic', 'true');
                this.liveRegion.className = 'sr-only';
                this.liveRegion.id = 'accessibility-announcements';
                document.body.appendChild(this.liveRegion);
            }

            const skipLink = document.createElement('a');
            skipLink.href = '#main-content';
            skipLink.textContent = 'Skip to main content';
            skipLink.className = 'skip-link';
            skipLink.style.cssText = `
                position: absolute;
                top: -40px;
                left: 6px;
                background: var(--color-primary);
                color: white;
                padding: 8px;
                text-decoration: none;
                border-radius: 4px;
                z-index: 1000;
                transition: top 0.3s;
            `;

            this.memoryManager.addEventListener(skipLink, 'focus', () => {
                skipLink.style.top = '6px';
            });

            this.memoryManager.addEventListener(skipLink, 'blur', () => {
                skipLink.style.top = '-40px';
            });

            document.body.insertBefore(skipLink, document.body.firstChild);

            const main = document.querySelector('.main');
            if (main) {
                main.id = 'main-content';
                main.setAttribute('role', 'main');
            }

            console.log('Accessibility features initialized');
        } catch (error) {
            console.error('Failed to initialize accessibility features:', error);
        }
    }

    /**
     * Khởi tạo các nút điều khiển tuỳ chỉnh
     */
    initializeCustomControls() {
        try {
            const playPauseBtn = document.getElementById('playPauseBtn');
            const muteBtn = document.getElementById('muteBtn');
            const stopBtn = document.getElementById('stopBtn');
            const fullscreenBtn = document.getElementById('fullscreenBtn');

            if (playPauseBtn) {
                this.memoryManager.addEventListener(playPauseBtn, 'click', () => {
                    const event = new CustomEvent('togglePlayPause');
                    document.dispatchEvent(event);
                });
            }

            if (muteBtn) {
                this.memoryManager.addEventListener(muteBtn, 'click', () => {
                    this.toggleMute();
                });
            }

            if (stopBtn) {
                this.memoryManager.addEventListener(stopBtn, 'click', () => {
                    const event = new CustomEvent('stopVideo');
                    document.dispatchEvent(event);
                });
            }

            if (fullscreenBtn) {
                this.memoryManager.addEventListener(fullscreenBtn, 'click', () => {
                    this.toggleFullscreen();
                });
            }

            const handleFullscreenChange = () => {
                this.updateFullscreenButton();
            };

            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
                .forEach(eventName => {
                    this.memoryManager.addEventListener(document, eventName, handleFullscreenChange);
                });

            this.keyboardHelpPanel = document.getElementById('keyboardHelp');

            console.log('Custom controls initialized');
        } catch (error) {
            console.error('Error initializing custom controls:', error);
        }
    }

    /**
     * Toggle mute/unmute
     */
    toggleMute() {
        try {
            const videoElement = document.getElementById('videoPlayer');
            if (!videoElement) return;

            videoElement.muted = !videoElement.muted;
            this.updateMuteButton();
        } catch (error) {
            console.error('Error toggling mute:', error);
        }
    }

    /**
     * Cập nhật icon và title cho nút mute
     */
    updateMuteButton() {
        try {
            const muteBtn = document.getElementById('muteBtn');
            const videoElement = document.getElementById('videoPlayer');

            if (muteBtn && videoElement) {
                const icon = muteBtn.querySelector('i');
                if (icon) {
                    if (videoElement.muted) {
                        icon.className = 'fas fa-volume-mute';
                        muteBtn.title = 'Unmute';
                    } else {
                        icon.className = 'fas fa-volume-up';
                        muteBtn.title = 'Mute';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating mute button:', error);
        }
    }

    /**
     * Toggle fullscreen cho video
     */
    toggleFullscreen() {
        try {
            const videoContainer = document.querySelector('.video-container');
            if (!videoContainer) return;

            if (!document.fullscreenElement) {
                this.requestFullscreen(videoContainer);
            } else {
                this.exitFullscreen();
            }
        } catch (error) {
            console.error('Error toggling fullscreen:', error);
        }
    }

    /**
     * Yêu cầu fullscreen với các vendor prefix cần thiết
     */
    requestFullscreen(element) {
        try {
            if (!element) {
                throw new Error('Fullscreen element is not available');
            }

            if (element.requestFullscreen) {
                return element.requestFullscreen();
            }
            if (element.webkitRequestFullscreen) {
                return element.webkitRequestFullscreen();
            }
            if (element.mozRequestFullScreen) {
                return element.mozRequestFullScreen();
            }
            if (element.msRequestFullscreen) {
                return element.msRequestFullscreen();
            }

            throw new Error('Fullscreen API not supported');
        } catch (error) {
            console.error('Error requesting fullscreen:', error);
            if (this.accessibleCallbacks.onError) {
                this.accessibleCallbacks.onError('Fullscreen mode is not supported in this browser');
            }
        }
    }

    /**
     * Thoát fullscreen với các vendor prefix cần thiết
     */
    exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                return document.exitFullscreen();
            }
            if (document.webkitExitFullscreen) {
                return document.webkitExitFullscreen();
            }
            if (document.mozCancelFullScreen) {
                return document.mozCancelFullScreen();
            }
            if (document.msExitFullscreen) {
                return document.msExitFullscreen();
            }

            throw new Error('Exit fullscreen API not supported');
        } catch (error) {
            console.error('Error exiting fullscreen:', error);
            if (this.accessibleCallbacks.onError) {
                this.accessibleCallbacks.onError('Unable to exit fullscreen mode');
            }
        }
    }

    /**
     * Cập nhật icon của nút fullscreen dựa trên trạng thái hiện tại
     */
    updateFullscreenButton() {
        try {
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            if (!fullscreenBtn) return;

            const icon = fullscreenBtn.querySelector('i');
            if (icon) {
                if (document.fullscreenElement) {
                    icon.className = 'fas fa-compress';
                    fullscreenBtn.classList.add('fullscreen');
                    fullscreenBtn.title = 'Exit fullscreen';
                } else {
                    icon.className = 'fas fa-expand';
                    fullscreenBtn.classList.remove('fullscreen');
                    fullscreenBtn.title = 'Fullscreen';
                }
            }
        } catch (error) {
            console.error('Error updating fullscreen button:', error);
        }
    }

    /**
     * Toggle bảng trợ giúp keyboard shortcuts
     */
    toggleKeyboardHelp() {
        try {
            if (!this.keyboardHelpPanel) {
                this.keyboardHelpPanel = document.getElementById('keyboardHelp');
            }

            const panel = this.keyboardHelpPanel;
            if (!panel) {
                console.warn('Keyboard help panel not found');
                return;
            }

            const isVisible = panel.style.display !== 'none';

            if (isVisible) {
                panel.style.display = 'none';
                panel.setAttribute('aria-hidden', 'true');

                if (this.lastFocusedElement) {
                    this.lastFocusedElement.focus();
                }
            } else {
                this.lastFocusedElement = document.activeElement;

                panel.style.display = 'flex';
                panel.setAttribute('aria-hidden', 'false');

                const closeButton = panel.querySelector('.btn');
                if (closeButton) {
                    closeButton.focus();
                }
            }

            this.announceToScreenReader(isVisible ? 'Keyboard shortcuts help closed' : 'Keyboard shortcuts help opened');
        } catch (error) {
            console.error('Error toggling keyboard help:', error);
        }
    }

    /**
     * Đóng bảng trợ giúp nếu đang mở
     */
    closeKeyboardHelp() {
        if (!this.keyboardHelpPanel) {
            this.keyboardHelpPanel = document.getElementById('keyboardHelp');
        }

        const panel = this.keyboardHelpPanel;
        if (!panel) return;

        const isVisible = panel.style.display !== 'none';
        if (isVisible) {
            panel.style.display = 'none';
            panel.setAttribute('aria-hidden', 'true');
            this.announceToScreenReader('Keyboard shortcuts help closed');

            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
            }
        }
    }

    /**
     * Thông báo message cho screen reader thông qua live region
     */
    announceToScreenReader(message) {
        try {
            if (!this.liveRegion) {
                this.liveRegion = document.getElementById('accessibility-announcements');
            }

            if (!this.liveRegion) return;

            this.liveRegion.textContent = message;

            setTimeout(() => {
                if (this.liveRegion) {
                    this.liveRegion.textContent = '';
                }
            }, 1000);
        } catch (error) {
            console.error('Error announcing to screen reader:', error);
        }
    }

    /**
     * Cập nhật nội dung element với hỗ trợ accessibility
     */
    updateElementAccessibly(element, newValue, oldValue) {
        if (!element || newValue === oldValue) return false;

        try {
            element.textContent = newValue;
            element.classList.add('updating');

            if (element.getAttribute && element.getAttribute('aria-live')) {
                const label = element.getAttribute('aria-label') || 'Value';
                this.announceToScreenReader(`${label} updated to ${newValue}`);
            }

            const timeout = setTimeout(() => {
                element.classList.remove('updating');
            }, 300);
            this.memoryManager.addTimeout(timeout);

            return true;
        } catch (error) {
            console.error('Error updating element accessibly:', error);
            return false;
        }
    }
}
