<template>
  <div class="app-container">
    <!-- Browser bar hidden as requested -->
    <!-- <div class="browser-bar">
      <div class="browser-controls">
        <button class="control-btn" @click="goBack" :disabled="!canGoBack" title="Back">←</button>
        <button class="control-btn" @click="goForward" :disabled="!canGoForward" title="Forward">→</button>
        <button class="control-btn" @click="reloadPage" title="Reload">↻</button>
      </div>
      <div class="address-bar">
        <input 
          v-model="currentUrl" 
          @keyup.enter="navigateTo"
          class="url-input"
          placeholder="Enter URL..."
        />
        <div class="connection-status" :class="connectionStatus">
          <span v-if="connectionStatus === 'connecting'">🔄</span>
          <span v-else-if="connectionStatus === 'connected'">✅</span>
          <span v-else-if="connectionStatus === 'error'">❌</span>
        </div>
        <button class="go-btn" @click="navigateTo">Go</button>
      </div>
    </div> -->
    
    <div class="browser-content">
      <div v-if="showLauncher" class="launcher-screen">
        <div class="launcher-card">
          <div class="launcher-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10V12H9V10H7ZM11 10V12H13V10H11ZM15 10V12H17V10H15ZM7 14V16H9V14H7ZM11 14V16H13V14H11ZM15 14V16H17V14H15Z" fill="#007bff"/>
            </svg>
          </div>
          <h2>MyCarl Accounting Software</h2>
          <p>Due to security restrictions, MyCarl cannot be embedded directly in an iframe.</p>
          <p>Click the button below to open MyCarl in a new tab where it will work normally.</p>
          
          <div class="launcher-buttons">
            <button class="launch-btn primary" @click="launchMyCarl">
              🚀 Launch MyCarl
            </button>
            <button class="launch-btn secondary" @click="tryEmbedded">
              🔧 Try Embedded (Limited)
            </button>
          </div>
          
          <div class="launcher-info">
            <h3>Why can't it be embedded?</h3>
            <ul>
              <li>MyCarl uses X-Frame-Options headers to prevent embedding</li>
              <li>CORS policies block cross-origin iframe access</li>
              <li>OAuth authentication requires same-origin requests</li>
              <li>These are security measures to protect user data</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Main content area with screenshot and side menu -->
      <div class="main-layout" v-else ref="mainLayout">
        <div class="screenshot-container" :class="{ 'no-transition': isResizing }" :style="screenshotStyle" :data-width="screenshotWidth">
          <div class="screenshot-wrapper" @click="openCarlApp">
            <img 
              src="/carl-screenshot.png" 
              alt="Carl Dashboard Screenshot" 
              class="carl-screenshot"
              @load="onScreenshotLoad"
              @error="onScreenshotError"
            />
          </div>
        </div>

        <!-- Draggable resize handle -->
        <div 
          class="resize-handle"
          @pointerdown="startResize"
        >
          <div class="separator"></div>
        </div>

        <!-- Side menu placeholder -->
        <div class="side-menu" :class="{ 'no-transition': isResizing }" :style="sideMenuStyle" :data-width="sideMenuWidth">
          <div class="side-menu-fill">
                   <!-- Freddy Chat Interface embedded -->
                   <freddy-chat-interface
                     class="freddy-chat-embed"
                     placeholder="Frage mich etwas über deine Buchhaltung..."
                     size="md"
                     theme="auto"
                     api-key="sk-frdy-cc5d7e78-9d99-4a5b-a144-1a784d2a3ed2"
                     api-base-url="/freddy-api"
                     organization-id="52"
                     :file-search="true"
                     :web-search="false"
                     :debug-mode="false"
                     welcomeTitle="CARL: dein neuer Buchhaltungsassistent"
                     welcomeText="Neu: Ab heute hilft dir CARL, dein persönlicher Buchhaltungsassistent, zu verstehen und bessere Entscheidungen zu treffen. Einfach fragen – klare Antworten in Echtzeit."
                   ></freddy-chat-interface>
          </div>
        </div>

        <!-- Fullscreen overlay during resize to guarantee pointerup -->
        <div
          v-if="isResizing"
          class="resize-overlay"
          @pointerup="stopResize"
          @mouseup="stopResize"
        ></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
             currentUrl: '/mycarl/client/8784/dashboard',
      canGoBack: false,
      canGoForward: false,
      navigationHistory: [],
      showLauncher: false,
      showError: false,
      loadAttempts: 0,
      connectionStatus: 'connecting',
      // Side menu properties - explicitly defined for reactivity
      screenshotWidth: 800,
      sideMenuWidth: 300,
      isResizing: false,
      startX: 0,
      startWidth: 0
    }
  },
  computed: {
    screenshotStyle() {
      // Use flex-basis to size the left pane precisely
      return {
        flexBasis: this.screenshotWidth + 'px'
      }
    },
    sideMenuStyle() {
      return {
        width: this.sideMenuWidth + 'px'
      }
    }
  },
  mounted() {
    console.log('MyCarl Integration App loaded successfully')
    this.navigationHistory.push(this.currentUrl)
    
    // Set initial screenshot width based on container size
    this.$nextTick(() => {
      const container = this.$refs.mainLayout
      if (container) {
        const containerWidth = container.clientWidth || window.innerWidth
        const handleWidth = 8
        this.screenshotWidth = Math.max(400, containerWidth - this.sideMenuWidth - handleWidth)
      } else {
        this.screenshotWidth = Math.max(400, window.innerWidth - this.sideMenuWidth - 8)
      }
      // Recalculate on resize
      window.addEventListener('resize', this.calculateMaxWidth)
    })
    
    // Customize Freddy chat welcome message
    this.customizeFreddyChat()
  },
  methods: {
    calculateMaxWidth() {
      const container = this.$refs.mainLayout
      const containerWidth = container ? container.clientWidth : window.innerWidth
      const handleWidth = 8
      const minWidth = 300
      const maxWidth = containerWidth - this.sideMenuWidth - handleWidth
      if (this.screenshotWidth > maxWidth) {
        this.screenshotWidth = Math.max(minWidth, maxWidth)
      }
    },
    openCarlApp() {
      // Open Carl in a new tab/window
      window.open('/mycarl/client/8565/dashboard', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    },
    
    customizeFreddyChat() {
      // Wait for the Freddy chat component to be fully loaded
      setTimeout(() => {
        const chatInterface = document.querySelector('.freddy-chat-embed')
        if (chatInterface) {
          // Find and replace the welcome title
          const welcomeTitle = chatInterface.querySelector('.chat-interface__welcome-title')
          if (welcomeTitle) {
            welcomeTitle.textContent = 'CARL: dein neuer Buchhaltungsassistent'
          }
          
          // Find and replace the welcome text
          const welcomeText = chatInterface.querySelector('.chat-interface__welcome-text')
          if (welcomeText) {
            welcomeText.textContent = 'Neu: Ab heute hilft dir CARL, dein persönlicher Buchhaltungsassistent, zu verstehen und bessere Entscheidungen zu treffen. Einfach fragen – klare Antworten in Echtzeit.'
          }
          
          // Also try to find by text content as fallback
          const allElements = chatInterface.querySelectorAll('*')
          allElements.forEach(element => {
            if (element.textContent === 'Start a conversation') {
              element.textContent = 'CARL: dein neuer Buchhaltungsassistent'
            }
            if (element.textContent === 'Type a message below to begin chatting with your AI assistant.') {
              element.textContent = 'Neu: Ab heute hilft dir CARL, dein persönlicher Buchhaltungsassistent, zu verstehen und bessere Entscheidungen zu treffen. Einfach fragen – klare Antworten in Echtzeit.'
            }
          })
          
          console.log('✅ Freddy chat welcome message customized')
        } else {
          console.log('❌ Freddy chat interface not found, retrying...')
          // Retry after another delay
          setTimeout(() => this.customizeFreddyChat(), 1000)
        }
      }, 2000)
    },
    
    updateNavigationState() {
      // Simple navigation state based on history
      this.canGoBack = this.navigationHistory.length > 1
      this.canGoForward = false // Simplified for now
    },
    
    goBack() {
      if (this.canGoBack && this.navigationHistory.length > 1) {
        this.navigationHistory.pop() // Remove current
        const previousUrl = this.navigationHistory[this.navigationHistory.length - 1]
        this.currentUrl = previousUrl
        this.navigateTo()
      }
    },
    
    goForward() {
      // Simplified forward functionality
      console.log('Forward navigation not implemented in iframe mode')
    },
    
    onScreenshotLoad() {
      console.log('Screenshot loaded successfully')
      this.connectionStatus = 'connected'
    },
    
    onScreenshotError(event) {
      console.error('Screenshot failed to load:', event)
      this.connectionStatus = 'error'
    },
    
    navigateTo() {
      // For screenshot mode, just open the URL in a new tab
      if (this.currentUrl) {
        window.open(this.currentUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
      }
    },
    
    launchMyCarl() {
      // Open MyCarl in a new tab/window
      window.open('/mycarl/', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    },
    
    openDashboardDirect() {
      // Open dashboard directly in new tab
      window.open('/mycarl/client/8565/dashboard', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    },
    
    tryEmbedded() {
      // Hide launcher and show screenshot
      this.showLauncher = false
    },

    // Side menu methods

    startResize(event) {
      // Use Pointer Events for robust capture
      const e = event instanceof PointerEvent ? event : null
      this.isResizing = true
      this.startX = (e ? e.clientX : event.clientX)
      this.startWidth = this.screenshotWidth
      
      // Capture pointer so we keep getting events even if leaving the handle
      try {
        if (e && event.currentTarget && event.currentTarget.setPointerCapture) {
          event.currentTarget.setPointerCapture(e.pointerId)
        }
      } catch (_) {}
      
      // Global listeners (pointer events preferred)
      window.addEventListener('pointermove', this.handleResize)
      window.addEventListener('pointerup', this.stopResize, { once: true })
      window.addEventListener('mouseup', this.stopResize, { once: true })
      window.addEventListener('blur', this.stopResize, { once: true })
      document.body.style.cursor = 'col-resize'
      event.preventDefault()
    },

    handleResize(event) {
      if (!this.isResizing) return
      const clientX = (event instanceof PointerEvent) ? event.clientX : event.clientX
      const deltaX = clientX - this.startX
      const newScreenshotWidth = this.startWidth + deltaX
      
      // Set minimum and maximum widths
      const container = this.$refs.mainLayout
      const containerWidth = container ? container.clientWidth : window.innerWidth
      const handleWidth = 8
      const minScreenshotWidth = 300
      const minSideMenuWidth = 200
      const maxScreenshotWidth = containerWidth - minSideMenuWidth - handleWidth
      
      // Update screenshot width with constraints
      this.screenshotWidth = Math.max(minScreenshotWidth, Math.min(newScreenshotWidth, maxScreenshotWidth))
      
      // Calculate side menu width as remaining space
      this.sideMenuWidth = containerWidth - this.screenshotWidth - handleWidth
    },

    stopResize() {
      this.isResizing = false
      window.removeEventListener('pointermove', this.handleResize)
      window.removeEventListener('pointerup', this.stopResize)
      window.removeEventListener('mouseup', this.stopResize)
      window.removeEventListener('blur', this.stopResize)
      document.body.style.cursor = 'default'
    },
    
  }
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.browser-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #ddd;
  padding: 8px 12px;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.browser-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #495057;
}

.control-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.address-bar {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.url-input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin: 0 0.5rem;
  font-size: 1rem;
}

.connection-status.connecting span {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.go-btn {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.go-btn:hover {
  background: #0056b3;
}

.browser-content {
  flex: 1;
  display: flex;
  background: white;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

/* Left pane is a fixed-basis flex item sized via inline style */
.screenshot-container {
  position: relative;
  height: 100%;
  flex: 0 0 auto; /* prevent growing/shrinking, we control size via flex-basis */
  display: flex;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.main-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.screenshot-container {
  position: relative;
  height: 100%;
  transition: none; /* instant while we drag; we control visuals via hover */
  flex-shrink: 0;
}

.screenshot-container.no-transition {
  transition: none;
}

.screenshot-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  overflow: hidden;
}

.carl-screenshot {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: white;
}

.resize-handle {
  width: 1px; /* subtle when idle */
  height: 100%;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.resize-handle .separator {
  position: absolute;
  left: -4px;
  top: 0;
  width: 9px; /* 9px hit area (4px on each side of center line) */
  height: 100%;
  background: transparent;
  transition: background-color 60ms linear;
}

.resize-handle:hover .separator,
.resize-handle:active .separator {
  background: rgba(0, 123, 255, 0.35); /* visible only on hover/drag */
}

.resize-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999; /* ensure it sits above the iframe to capture pointerup */
  background: transparent;
  cursor: col-resize;
}

.side-menu {
  height: 100%;
  background: #f8f9fa;
  border-left: 1px solid #dee2e6;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* Only apply transition when not resizing */
.side-menu:not(.no-transition) {
  transition: width 0.3s ease;
}

.side-menu-fill {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* Allow flexbox to shrink */
}

.freddy-chat-embed {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  display: flex !important;
  min-height: 0 !important; /* Remove any minimum height constraints */
  max-height: none !important; /* Remove any maximum height constraints */
  overflow: hidden; /* Prevent content from overflowing */
  padding: 0 !important; /* Remove all padding */
  margin: 0 !important; /* Remove all margins */
}

/* Target all child elements of the chat interface to ensure full height */
.freddy-chat-embed *,
.freddy-chat-embed::before,
.freddy-chat-embed::after {
  box-sizing: border-box !important;
}

/* Ensure the root element of the chat interface fills the container */
.freddy-chat-embed > * {
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  flex: 1 1 auto !important;
}

/* Override hardcoded height constraints in the chat interface component */
.freddy-chat-embed .chat-interface__messages {
  min-height: 0 !important;
  max-height: none !important;
  height: auto !important;
  flex: 1 !important;
}



.launcher-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.launcher-card {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e5e9;
}

.launcher-icon {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

.launcher-card h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.8rem;
  font-weight: 600;
}

.launcher-card p {
  color: #6c757d;
  margin-bottom: 1rem;
  line-height: 1.6;
  font-size: 1.1rem;
}

.launcher-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
}

.launch-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 160px;
}

.launch-btn.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
}

.launch-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
}

.launch-btn.secondary {
  background: #f8f9fa;
  color: #6c757d;
  border: 2px solid #dee2e6;
}

.launch-btn.secondary:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.launcher-info {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #dee2e6;
  text-align: left;
}

.launcher-info h3 {
  color: #495057;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.launcher-info ul {
  color: #6c757d;
  line-height: 1.6;
  padding-left: 1.5rem;
}

.launcher-info li {
  margin-bottom: 0.5rem;
}

.error-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  text-align: center;
}

.error-message h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.error-message ul {
  text-align: left;
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.error-message li {
  margin-bottom: 0.5rem;
}

.error-details {
  text-align: left;
  max-width: 500px;
  margin: 1.5rem 0;
}

.error-details h4 {
  color: white;
  margin: 1rem 0 0.5rem 0;
  font-size: 1.1rem;
}

.error-details p {
  margin-bottom: 1rem;
  opacity: 0.9;
}

.error-details ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.error-details li {
  margin-bottom: 0.8rem;
  line-height: 1.4;
}

.quick-access-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
}

.quick-access-card {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.quick-access-card h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1.5rem 0;
  flex-wrap: wrap;
}

.quick-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  min-width: 160px;
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.quick-btn.primary {
  background: rgba(255, 255, 255, 0.9);
  color: #28a745;
  border-color: rgba(255, 255, 255, 0.9);
}

.quick-btn.primary:hover {
  background: white;
  transform: translateY(-2px);
}

.quick-note {
  margin-top: 1rem;
  font-size: 0.9rem;
  opacity: 0.9;
}

.error-actions {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}

.retry-btn, .error-message .launch-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.retry-btn:hover, .error-message .launch-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.error-note {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-top: 1rem;
}

.error-note code {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

/* Freddy Chat Interface Styling Fix - COMMENTED OUT TO TEST NPM PACKAGE */
/*
.freddy-chat-embed {
  --freddy-border-color: #d1d5db;
  --freddy-input-border: 1px solid #d1d5db;
  --freddy-input-border-focus: 1px solid #3b82f6;
  --freddy-input-border-radius: 8px;
}

.freddy-chat-embed::part(chat-input),
.freddy-chat-embed >>> .chat-input,
.freddy-chat-embed /deep/ .chat-input {
  border: 1px solid #d1d5db !important;
  border-radius: 8px !important;
}

.freddy-chat-embed::part(chat-input):focus,
.freddy-chat-embed >>> .chat-input:focus,
.freddy-chat-embed /deep/ .chat-input:focus {
  border-color: #3b82f6 !important;
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

.freddy-chat-embed input[type="text"],
.freddy-chat-embed input[type="search"],
.freddy-chat-embed textarea {
  border: 1px solid #d1d5db !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
}

.freddy-chat-embed input[type="text"]:focus,
.freddy-chat-embed input[type="search"]:focus,
.freddy-chat-embed textarea:focus {
  border-color: #3b82f6 !important;
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

.freddy-chat-embed * {
  --border-radius: 8px !important;
  --input-border-radius: 8px !important;
}

.freddy-chat-embed input,
.freddy-chat-embed textarea,
.freddy-chat-embed [contenteditable],
.freddy-chat-embed .input,
.freddy-chat-embed .chat-input,
.freddy-chat-embed .message-input {
  border-radius: 8px !important;
  border: 1px solid #d1d5db !important;
}

.freddy-chat-embed input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]) {
  border-radius: 8px !important;
  border: 1px solid #d1d5db !important;
  padding: 8px 12px !important;
}
*/

/* CARL Custom Styling - Replace Welcome State */

/* More aggressive approach - target all possible selectors */
.freddy-chat-embed * {
  position: relative;
}

/* Hide original welcome content */
.freddy-chat-embed .chat-interface__welcome-title,
.freddy-chat-embed h3,
.freddy-chat-embed .welcome-title,
.freddy-chat-embed .chat-interface__welcome-text,
.freddy-chat-embed p,
.freddy-chat-embed .welcome-text {
  font-size: 0 !important;
  line-height: 0 !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* Add custom content using ::before and ::after */
.freddy-chat-embed .chat-interface__welcome::before {
  content: 'CARL: dein neuer Buchhaltungsassistent' !important;
  display: block !important;
  font-size: 1.5rem !important;
  line-height: 1.2 !important;
  font-weight: 600 !important;
  color: #374151 !important;
  margin-bottom: 8px !important;
  text-align: center !important;
}

.freddy-chat-embed .chat-interface__welcome::after {
  content: 'Neu: Ab heute hilft dir CARL, dein persönlicher Buchhaltungsassistent, zu verstehen und bessere Entscheidungen zu treffen. Einfach fragen – klare Antworten in Echtzeit.' !important;
  display: block !important;
  font-size: 1rem !important;
  line-height: 1.5 !important;
  color: #6b7280 !important;
  text-align: center !important;
  margin-top: 8px !important;
}

/* Custom CARL avatar - replace chat bubble with custom image */
.freddy-chat-embed .chat-interface__welcome-icon {
  font-size: 0 !important;
  line-height: 0 !important;
  margin-bottom: 1rem !important;
}

.freddy-chat-embed .chat-interface__welcome-icon::before {
  content: '' !important;
  display: inline-block !important;
  width: 60px !important;
  height: 60px !important;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiMwMDdCRkYiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01IDEuNDEtMS40MUwxMCAxNC4xN2w3LjU5LTcuNTlMMTkgOGwtOSA5eiIvPgo8L3N2Zz4KPC9zdmc+') !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  border-radius: 50% !important;
}

/* Responsive design */
@media (max-width: 768px) {
  .browser-bar {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }
  
  .browser-controls {
    align-self: flex-start;
  }
  
  .address-bar {
    width: 100%;
  }
}
</style>
