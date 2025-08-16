// Sync manager for offline clock data
import { 
  getPendingClockData, 
  updateClockDataStatus, 
  deleteSyncedClockData,
  getOfflineShiftState,
  clearOfflineShiftState 
} from './offlineStorage';

// GraphQL mutations for syncing
const CLOCK_IN_MUTATION = `
  mutation ClockIn($note: String, $lat: Float!, $lng: Float!, $manualOverride: Boolean) {
    clockIn(note: $note, lat: $lat, lng: $lng, manualOverride: $manualOverride) {
      id
      clockInAt
      clockInLat
      clockInLng
      note
    }
  }
`;

const CLOCK_OUT_MUTATION = `
  mutation ClockOut($note: String, $lat: Float!, $lng: Float!, $manualOverride: Boolean) {
    clockOut(note: $note, lat: $lat, lng: $lng, manualOverride: $manualOverride) {
      id
      clockOutAt
      clockOutLat
      clockOutLng
      note
    }
  }
`;

// Sync single clock entry
const syncClockEntry = async (entry) => {
  try {
    const mutation = entry.type === 'CLOCK_IN' ? CLOCK_IN_MUTATION : CLOCK_OUT_MUTATION;
    
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          note: entry.note,
          lat: entry.location.lat,
          lng: entry.location.lng,
          manualOverride: entry.manualOverride || false,
        },
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    // Mark as synced and delete
    await updateClockDataStatus(entry.id, 'SYNCED');
    await deleteSyncedClockData(entry.id);
    
    console.log(`Successfully synced ${entry.type}:`, result.data);
    return { success: true, data: result.data };
    
  } catch (error) {
    console.error(`Failed to sync ${entry.type}:`, error);
    await updateClockDataStatus(entry.id, 'FAILED', error.message);
    return { success: false, error: error.message };
  }
};

// Sync all pending clock data
export const syncPendingClockData = async () => {
  try {
    const pendingData = await getPendingClockData();
    
    if (pendingData.length === 0) {
      console.log('No pending clock data to sync');
      return { synced: 0, failed: 0 };
    }

    console.log(`Syncing ${pendingData.length} pending clock entries...`);
    
    // Sort by timestamp to maintain chronological order
    pendingData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    let synced = 0;
    let failed = 0;
    
    for (const entry of pendingData) {
      // Skip entries that have failed too many times
      if (entry.retryCount >= 3) {
        console.log(`Skipping entry ${entry.id} - too many retry attempts`);
        failed++;
        continue;
      }
      
      const result = await syncClockEntry(entry);
      if (result.success) {
        synced++;
      } else {
        failed++;
      }
      
      // Small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clear offline shift state if all data synced successfully
    if (synced > 0 && failed === 0) {
      clearOfflineShiftState();
    }
    
    console.log(`Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
    
  } catch (error) {
    console.error('Failed to sync pending clock data:', error);
    return { synced: 0, failed: 0, error: error.message };
  }
};

// Auto-sync when online
export const startAutoSync = () => {
  const handleOnline = async () => {
    console.log('Network connection restored - starting auto-sync...');
    const result = await syncPendingClockData();
    
    if (result.synced > 0) {
      // Show success notification
      if (typeof window !== 'undefined' && window.showNotification) {
        window.showNotification('success', `${result.synced} clock entries synced successfully`);
      }
    }
    
    if (result.failed > 0) {
      // Show warning notification
      if (typeof window !== 'undefined' && window.showNotification) {
        window.showNotification('warning', `${result.failed} entries failed to sync - will retry later`);
      }
    }
  };

  // Listen for online events
  window.addEventListener('online', handleOnline);
  
  // Initial sync if already online
  if (navigator.onLine) {
    setTimeout(handleOnline, 1000); // Small delay to ensure app is ready
  }
  
  return () => {
    window.removeEventListener('online', handleOnline);
  };
};

// Manual sync trigger
export const triggerManualSync = async () => {
  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }
  
  return await syncPendingClockData();
};
