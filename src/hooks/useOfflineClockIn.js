// Custom hook for offline-capable clock in/out
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { 
  storeOfflineClockData, 
  getOfflineShiftState, 
  setOfflineShiftState, 
  clearOfflineShiftState,
  isOnline,
  addNetworkListeners 
} from '../utils/offlineStorage';
import { startAutoSync } from '../utils/syncManager';

import { CLOCK_IN, CLOCK_OUT } from '../graphql/operations';

export const useOfflineClockIn = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [localOpenShift, setLocalOpenShift] = useState(null);

  // Original mutations
  const [originalClockIn, { loading: clockingIn }] = useMutation(CLOCK_IN);
  const [originalClockOut, { loading: clockingOut }] = useMutation(CLOCK_OUT);

  // Initialize offline state and sync manager
  useEffect(() => {
    // Load offline shift state
    const offlineShift = getOfflineShiftState();
    if (offlineShift) {
      setLocalOpenShift(offlineShift);
    }

    // Start auto-sync manager
    const cleanup = startAutoSync();

    // Add network listeners
    const removeNetworkListeners = addNetworkListeners(
      () => {
        setIsOffline(false);
        console.log('Network connection restored');
      },
      () => {
        setIsOffline(true);
        console.log('Network connection lost');
      }
    );

    return () => {
      cleanup();
      removeNetworkListeners();
    };
  }, []);

  // Enhanced clock in function
  const clockIn = useCallback(async ({ variables }) => {
    const clockData = {
      type: 'CLOCK_IN',
      timestamp: new Date().toISOString(),
      location: { lat: variables.lat, lng: variables.lng },
      note: variables.note,
      manualOverride: variables.manualOverride || false,
    };

    if (isOnline()) {
      try {
        // Try online first
        const result = await originalClockIn({ variables });
        
        // Update local state
        const shiftData = {
          id: result.data.clockIn.id,
          clockInAt: result.data.clockIn.clockInAt,
          clockInLat: result.data.clockIn.clockInLat,
          clockInLng: result.data.clockIn.clockInLng,
          note: result.data.clockIn.note,
        };
        setLocalOpenShift(shiftData);
        setOfflineShiftState(shiftData);
        
        console.log('Successfully clocked in');
        return result;
        
      } catch (error) {
        // If online request fails, fall back to offline storage
        console.log('Online clock-in failed, storing offline:', error);
        await storeOfflineClockData(clockData);
        
        // Update local state optimistically
        const localShift = {
          id: `offline_${Date.now()}`,
          clockInAt: clockData.timestamp,
          clockInLat: clockData.location.lat,
          clockInLng: clockData.location.lng,
          note: clockData.note,
          offline: true,
        };
        setLocalOpenShift(localShift);
        setOfflineShiftState(localShift);
        
        console.log('Clocked in offline - will sync when online');
        setPendingSyncCount(prev => prev + 1);
        return { data: { clockIn: localShift } };
      }
    } else {
      // Store offline
      await storeOfflineClockData(clockData);
      
      // Update local state optimistically
      const localShift = {
        id: `offline_${Date.now()}`,
        clockInAt: clockData.timestamp,
        clockInLat: clockData.location.lat,
        clockInLng: clockData.location.lng,
        note: clockData.note,
        offline: true,
      };
      setLocalOpenShift(localShift);
      setOfflineShiftState(localShift);
      
      console.log('Clocked in offline - will sync when online');
      setPendingSyncCount(prev => prev + 1);
      return { data: { clockIn: localShift } };
    }
  }, [originalClockIn]);

  // Enhanced clock out function
  const clockOut = useCallback(async ({ variables }) => {
    const clockData = {
      type: 'CLOCK_OUT',
      timestamp: new Date().toISOString(),
      location: { lat: variables.lat, lng: variables.lng },
      note: variables.note,
      manualOverride: variables.manualOverride || false,
    };

    if (isOnline()) {
      try {
        // Try online first
        const result = await originalClockOut({ variables });
        
        // Clear local state
        setLocalOpenShift(null);
        clearOfflineShiftState();
        
        console.log('Successfully clocked out');
        return result;
        
      } catch (error) {
        // If online request fails, fall back to offline storage
        console.log('Online clock-out failed, storing offline:', error);
        await storeOfflineClockData(clockData);
        
        // Clear local state optimistically
        setLocalOpenShift(null);
        clearOfflineShiftState();
        
        console.log('Clocked out offline - will sync when online');
        setPendingSyncCount(prev => prev + 1);
        return { data: { clockOut: { success: true } } };
      }
    } else {
      // Store offline
      await storeOfflineClockData(clockData);
      
      // Clear local state optimistically
      setLocalOpenShift(null);
      clearOfflineShiftState();
      
      console.log('Clocked out offline - will sync when online');
      setPendingSyncCount(prev => prev + 1);
      return { data: { clockOut: { success: true } } };
    }
  }, [originalClockOut]);

  return {
    clockIn,
    clockOut,
    clockingIn,
    clockingOut,
    isOffline,
    pendingSyncCount,
    localOpenShift, // Use this instead of the GraphQL query result when offline
  };
};
