// React Hook for Background Sync Integration
import { useState, useEffect, useCallback } from 'react';
import backgroundManager from '../utils/backgroundManager';

export const useBackgroundSync = () => {
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState({
    isInitialized: false,
    notificationPermission: 'default',
    capabilities: {}
  });
  const [syncEvents, setSyncEvents] = useState([]);

  // Initialize background manager
  useEffect(() => {
    const initializeBackground = async () => {
      const success = await backgroundManager.initialize();
      if (success) {
        const status = backgroundManager.getStatus();
        setBackgroundStatus(status);
        setIsBackgroundEnabled(status.isBackgroundEnabled);
      }
    };

    initializeBackground();
  }, []);

  // Listen for background events
  useEffect(() => {
    const handleSyncSuccess = (event) => {
      setSyncEvents(prev => [...prev, {
        type: 'sync_success',
        data: event.detail,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleLocationUpdate = (event) => {
      setSyncEvents(prev => [...prev, {
        type: 'location_update',
        data: event.detail,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleBackgroundClockAction = (event) => {
      setSyncEvents(prev => [...prev, {
        type: 'clock_action',
        data: event.detail,
        timestamp: new Date().toISOString()
      }]);
    };

    window.addEventListener('backgroundSyncSuccess', handleSyncSuccess);
    window.addEventListener('backgroundLocationUpdate', handleLocationUpdate);
    window.addEventListener('backgroundClockAction', handleBackgroundClockAction);

    return () => {
      window.removeEventListener('backgroundSyncSuccess', handleSyncSuccess);
      window.removeEventListener('backgroundLocationUpdate', handleLocationUpdate);
      window.removeEventListener('backgroundClockAction', handleBackgroundClockAction);
    };
  }, []);

  // Enable background tracking
  const enableBackgroundTracking = useCallback(async (userSettings) => {
    const success = await backgroundManager.enableBackgroundTracking(userSettings);
    if (success) {
      setIsBackgroundEnabled(true);
      return true;
    }
    return false;
  }, []);

  // Disable background tracking
  const disableBackgroundTracking = useCallback(async () => {
    await backgroundManager.disableBackgroundTracking();
    setIsBackgroundEnabled(false);
  }, []);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    await backgroundManager.syncPendingData();
  }, []);

  // Show notification
  const showNotification = useCallback(async (title, options) => {
    return await backgroundManager.showNotification(title, options);
  }, []);

  // Clear sync events
  const clearSyncEvents = useCallback(() => {
    setSyncEvents([]);
  }, []);

  return {
    isBackgroundEnabled,
    backgroundStatus,
    syncEvents,
    enableBackgroundTracking,
    disableBackgroundTracking,
    triggerSync,
    showNotification,
    clearSyncEvents
  };
};
