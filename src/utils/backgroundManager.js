// Background Manager for PWA Background Processing
class BackgroundManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.registration = null;
    this.isBackgroundEnabled = false;
  }

  async initialize() {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw-custom.js');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Request notification permission
      await this.requestNotificationPermission();
      
      // Request persistent notification permission for background
      await this.requestBackgroundPermissions();
      
      // Set up message listener
      this.setupMessageListener();
      
      console.log('Background manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize background manager:', error);
      return false;
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async requestBackgroundPermissions() {
    try {
      // Request persistent notification permission (for background processing)
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'notifications' });
        if (result.state !== 'granted') {
          await Notification.requestPermission();
        }
      }

      // Request background sync permission
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        // Background sync is available
        this.isBackgroundEnabled = true;
      }

      // Request periodic background sync (limited support)
      if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') {
          await this.registration.periodicSync.register('location-check', {
            minInterval: 5 * 60 * 1000, // 5 minutes
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to request background permissions:', error);
      return false;
    }
  }

  setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'SYNC_SUCCESS':
          this.handleSyncSuccess(data);
          break;
        case 'LOCATION_UPDATE':
          this.handleLocationUpdate(data);
          break;
        case 'BACKGROUND_CLOCK_ACTION':
          this.handleBackgroundClockAction(data);
          break;
      }
    });
  }

  handleSyncSuccess(data) {
    // Notify the app that sync was successful
    window.dispatchEvent(new CustomEvent('backgroundSyncSuccess', { detail: data }));
    
    // Show success notification
    this.showNotification('Sync Complete', {
      body: 'Clock entries synced successfully',
      icon: '/icons/icon-192.png',
      tag: 'sync-success'
    });
  }

  handleLocationUpdate(data) {
    // Update location in the app
    window.dispatchEvent(new CustomEvent('backgroundLocationUpdate', { detail: data }));
  }

  handleBackgroundClockAction(data) {
    // Handle background clock in/out
    window.dispatchEvent(new CustomEvent('backgroundClockAction', { detail: data }));
  }

  async enableBackgroundTracking(userSettings) {
    if (!this.registration) {
      console.error('Service worker not registered');
      return false;
    }

    try {
      // Send user settings to service worker
      this.registration.active.postMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: {
          backgroundLocationEnabled: true,
          workLocation: userSettings.workLocation,
          hasOpenShift: userSettings.hasOpenShift,
          lastLocationStatus: userSettings.lastLocationStatus || 'unknown'
        }
      });

      // Register background sync
      this.registration.active.postMessage({
        type: 'REGISTER_BACKGROUND_SYNC'
      });

      // Start location tracking
      this.registration.active.postMessage({
        type: 'START_LOCATION_TRACKING'
      });

      return true;
    } catch (error) {
      console.error('Failed to enable background tracking:', error);
      return false;
    }
  }

  async disableBackgroundTracking() {
    if (!this.registration) return;

    try {
      this.registration.active.postMessage({
        type: 'UPDATE_USER_SETTINGS',
        data: {
          backgroundLocationEnabled: false
        }
      });
    } catch (error) {
      console.error('Failed to disable background tracking:', error);
    }
  }

  async showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options
      });
    }
  }

  async syncPendingData() {
    if (!this.registration) return;

    try {
      this.registration.active.postMessage({
        type: 'REGISTER_BACKGROUND_SYNC'
      });
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  }

  // Check if background features are supported
  getCapabilities() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      periodicBackgroundSync: 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype,
      geolocation: 'geolocation' in navigator
    };
  }

  // Get background processing status
  getStatus() {
    return {
      isInitialized: !!this.registration,
      isBackgroundEnabled: this.isBackgroundEnabled,
      notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
      capabilities: this.getCapabilities()
    };
  }
}

// Create singleton instance
const backgroundManager = new BackgroundManager();

export default backgroundManager;
