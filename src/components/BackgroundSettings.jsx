// Background Settings Component for PWA Background Processing Control
import React, { useState, useEffect } from 'react';
import { useBackgroundSync } from '../hooks/useBackgroundSync';

const BackgroundSettings = () => {
  const {
    isBackgroundEnabled,
    backgroundStatus,
    syncEvents,
    enableBackgroundTracking,
    disableBackgroundTracking,
    triggerSync,
    showNotification,
    clearSyncEvents
  } = useBackgroundSync();

  const [settings, setSettings] = useState({
    backgroundTracking: false,
    notifications: false,
    autoSync: true
  });

  const [showDetails, setShowDetails] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('backgroundSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('backgroundSettings', JSON.stringify(newSettings));
  };

  const handleToggleBackgroundTracking = async () => {
    const newValue = !settings.backgroundTracking;
    
    if (newValue) {
      // Enable background tracking
      const success = await enableBackgroundTracking({
        workLocation: JSON.parse(localStorage.getItem('currentWorkLocation') || '{}'),
        hasOpenShift: !!localStorage.getItem('currentOpenShift'),
        lastLocationStatus: 'unknown'
      });
      
      if (success) {
        saveSettings({ ...settings, backgroundTracking: true });
        showNotification('Background Tracking Enabled', {
          body: 'App will now track location and auto clock-in/out in background',
          tag: 'background-enabled'
        });
      }
    } else {
      // Disable background tracking
      await disableBackgroundTracking();
      saveSettings({ ...settings, backgroundTracking: false });
      showNotification('Background Tracking Disabled', {
        body: 'Background location tracking has been turned off',
        tag: 'background-disabled'
      });
    }
  };

  const handleNotificationToggle = async () => {
    const newValue = !settings.notifications;
    
    if (newValue && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        saveSettings({ ...settings, notifications: true });
      }
    } else {
      saveSettings({ ...settings, notifications: newValue });
    }
  };

  const handleManualSync = async () => {
    await triggerSync();
    showNotification('Manual Sync Triggered', {
      body: 'Syncing pending data with server...',
      tag: 'manual-sync'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      case 'default': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      case 'default': return 'Not requested';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Background Processing</h3>
        <div className="flex items-center gap-2">
          {isBackgroundEnabled && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Main Settings */}
      <div className="space-y-4">
        {/* Background Tracking Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Background Location Tracking
            </label>
            <p className="text-xs text-gray-500">
              Auto clock-in/out when entering/leaving work area
            </p>
          </div>
          <button
            onClick={handleToggleBackgroundTracking}
            disabled={!backgroundStatus.capabilities?.backgroundSync}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.backgroundTracking ? 'bg-blue-600' : 'bg-gray-200'
            } ${!backgroundStatus.capabilities?.backgroundSync ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.backgroundTracking ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Push Notifications
            </label>
            <p className="text-xs text-gray-500">
              Get notified about clock-in/out events
            </p>
          </div>
          <button
            onClick={handleNotificationToggle}
            disabled={!backgroundStatus.capabilities?.notifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.notifications ? 'bg-blue-600' : 'bg-gray-200'
            } ${!backgroundStatus.capabilities?.notifications ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Manual Sync Button */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Manual Sync
            </label>
            <p className="text-xs text-gray-500">
              Force sync pending data now
            </p>
          </div>
          <button
            onClick={handleManualSync}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Sync Now
          </button>
        </div>
      </div>

      {/* Detailed Status */}
      {showDetails && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">System Status</h4>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Service Worker:</span>
              <span className={`ml-2 font-medium ${backgroundStatus.isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                {backgroundStatus.isInitialized ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Notifications:</span>
              <span className={`ml-2 font-medium ${getStatusColor(backgroundStatus.notificationPermission)}`}>
                {getStatusText(backgroundStatus.notificationPermission)}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Background Sync:</span>
              <span className={`ml-2 font-medium ${backgroundStatus.capabilities?.backgroundSync ? 'text-green-600' : 'text-red-600'}`}>
                {backgroundStatus.capabilities?.backgroundSync ? 'Supported' : 'Not Supported'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Geolocation:</span>
              <span className={`ml-2 font-medium ${backgroundStatus.capabilities?.geolocation ? 'text-green-600' : 'text-red-600'}`}>
                {backgroundStatus.capabilities?.geolocation ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Recent Sync Events */}
          {syncEvents.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-900">Recent Events</h5>
                <button
                  onClick={clearSyncEvents}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-1">
                {syncEvents.slice(-5).reverse().map((event, index) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {event.type.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.data && (
                      <div className="text-gray-600 mt-1">
                        {JSON.stringify(event.data, null, 2).slice(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning for unsupported features */}
      {(!backgroundStatus.capabilities?.backgroundSync || !backgroundStatus.capabilities?.notifications) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-2">
              <h6 className="text-sm font-medium text-yellow-800">Limited Support</h6>
              <p className="text-xs text-yellow-700 mt-1">
                Some background features may not work on this device/browser. 
                For best experience, use a modern browser and install the app to your home screen.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundSettings;
