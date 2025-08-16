// Custom Service Worker for Background Processing
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Background sync for offline clock data
const BACKGROUND_SYNC_TAG = 'clock-sync';
const LOCATION_TRACKING_TAG = 'location-tracking';
const NOTIFICATION_TAG = 'clock-notification';

// IndexedDB helper for background operations
class BackgroundDB {
  constructor() {
    this.dbName = 'LiefClockBackground';
    this.version = 1;
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for pending clock entries
        if (!db.objectStoreNames.contains('pendingClockEntries')) {
          const clockStore = db.createObjectStore('pendingClockEntries', { keyPath: 'id' });
          clockStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store for location tracking
        if (!db.objectStoreNames.contains('locationHistory')) {
          const locationStore = db.createObjectStore('locationHistory', { keyPath: 'id' });
          locationStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store for user settings
        if (!db.objectStoreNames.contains('userSettings')) {
          db.createObjectStore('userSettings', { keyPath: 'key' });
        }
      };
    });
  }

  async addPendingClockEntry(entry) {
    const db = await this.openDB();
    const tx = db.transaction(['pendingClockEntries'], 'readwrite');
    await tx.objectStore('pendingClockEntries').add(entry);
  }

  async getPendingClockEntries() {
    const db = await this.openDB();
    const tx = db.transaction(['pendingClockEntries'], 'readonly');
    return new Promise((resolve, reject) => {
      const request = tx.objectStore('pendingClockEntries').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingClockEntry(id) {
    const db = await this.openDB();
    const tx = db.transaction(['pendingClockEntries'], 'readwrite');
    await tx.objectStore('pendingClockEntries').delete(id);
  }

  async addLocationHistory(location) {
    const db = await this.openDB();
    const tx = db.transaction(['locationHistory'], 'readwrite');
    await tx.objectStore('locationHistory').add(location);
  }

  async getUserSettings() {
    const db = await this.openDB();
    const tx = db.transaction(['userSettings'], 'readonly');
    const settings = {};
    const cursor = await tx.objectStore('userSettings').openCursor();
    
    return new Promise((resolve) => {
      const results = {};
      if (!cursor) {
        resolve(results);
        return;
      }
      
      cursor.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results[cursor.value.key] = cursor.value.value;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }
}

const backgroundDB = new BackgroundDB();

// Background Sync for clock entries
self.addEventListener('sync', async (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(syncPendingClockEntries());
  }
  
  if (event.tag === LOCATION_TRACKING_TAG) {
    event.waitUntil(performLocationCheck());
  }
});

// Sync pending clock entries when online
async function syncPendingClockEntries() {
  try {
    const pendingEntries = await backgroundDB.getPendingClockEntries();
    
    for (const entry of pendingEntries) {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: entry.type === 'clockIn' ? 
              `mutation ClockIn($note: String, $lat: Float, $lng: Float) {
                clockIn(note: $note, lat: $lat, lng: $lng) {
                  id
                  clockInTime
                }
              }` :
              `mutation ClockOut($note: String, $lat: Float, $lng: Float) {
                clockOut(note: $note, lat: $lat, lng: $lng) {
                  id
                  clockOutTime
                }
              }`,
            variables: entry.variables
          })
        });

        if (response.ok) {
          await backgroundDB.removePendingClockEntry(entry.id);
          
          // Send notification to all clients
          const clients = await self.clients.matchAll();
          const responseData = await response.json();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: { entry, response: responseData }
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync clock entry:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Periodic background location checking
async function performLocationCheck() {
  try {
    const settings = await backgroundDB.getUserSettings();
    
    if (!settings.backgroundLocationEnabled) {
      return;
    }

    // Get current position (this requires permission)
    const position = await getCurrentPosition();
    const workLocation = settings.workLocation;
    
    if (position && workLocation) {
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        workLocation.latitude,
        workLocation.longitude
      );
      
      const isInside = distance <= workLocation.radiusKm + 0.05;
      const wasInside = settings.lastLocationStatus === 'inside';
      const hasOpenShift = settings.hasOpenShift;
      
      // Store location history
      await backgroundDB.addLocationHistory({
        id: Date.now(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
        distance,
        isInside
      });
      
      // Auto clock-in/out logic
      if (isInside !== wasInside) {
        if (isInside && !hasOpenShift) {
          // Auto clock-in
          await handleBackgroundClockIn(position, distance);
        } else if (!isInside && hasOpenShift) {
          // Auto clock-out
          await handleBackgroundClockOut(position, distance);
        }
      }
      
      // Update location status
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'LOCATION_UPDATE',
          data: { position, distance, isInside }
        });
      });
    }
  } catch (error) {
    console.error('Background location check failed:', error);
  }
}

// Handle background clock-in
async function handleBackgroundClockIn(position, distance) {
  const clockEntry = {
    id: Date.now(),
    type: 'clockIn',
    timestamp: new Date().toISOString(),
    variables: {
      note: `Auto clock-in (${formatDistance(distance)} from work)`,
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }
  };
  
  await backgroundDB.addPendingClockEntry(clockEntry);
  
  // Show notification
  await self.registration.showNotification('Lief Clock', {
    body: 'You have been automatically clocked in',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: NOTIFICATION_TAG,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'View Dashboard' }
    ]
  });
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    await syncPendingClockEntries();
  }
}

// Handle background clock-out
async function handleBackgroundClockOut(position, distance) {
  const clockEntry = {
    id: Date.now(),
    type: 'clockOut',
    timestamp: new Date().toISOString(),
    variables: {
      note: `Auto clock-out (${formatDistance(distance)} from work)`,
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }
  };
  
  await backgroundDB.addPendingClockEntry(clockEntry);
  
  // Show notification
  await self.registration.showNotification('Lief Clock', {
    body: 'You have been automatically clocked out',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: NOTIFICATION_TAG,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'View Dashboard' }
    ]
  });
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    await syncPendingClockEntries();
  }
}

// Utility functions
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(2)}km`;
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'REGISTER_BACKGROUND_SYNC':
      await self.registration.sync.register(BACKGROUND_SYNC_TAG);
      break;
      
    case 'START_LOCATION_TRACKING':
      await self.registration.sync.register(LOCATION_TRACKING_TAG);
      break;
      
    case 'UPDATE_USER_SETTINGS':
      const db = await backgroundDB.openDB();
      const tx = db.transaction(['userSettings'], 'readwrite');
      const store = tx.objectStore('userSettings');
      
      for (const [key, value] of Object.entries(data)) {
        await store.put({ key, value });
      }
      break;
  }
});

// Periodic background sync (every 5 minutes when app is in background)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-check') {
    event.waitUntil(performLocationCheck());
  }
});

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Network status change
self.addEventListener('online', () => {
  syncPendingClockEntries();
});

// Cache strategies for different resources
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 3,
  })
);

registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-resources',
  })
);
