// Offline storage utilities for clock in/out data
import { openDB } from 'idb';

const DB_NAME = 'LiefClockDB';
const DB_VERSION = 1;
const STORE_NAME = 'clockData';

// Initialize IndexedDB
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('userId', 'userId');
      }
    },
  });
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Store offline clock data
export const storeOfflineClockData = async (clockData) => {
  try {
    const db = await initDB();
    const data = {
      id: generateId(),
      ...clockData,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    await db.add(STORE_NAME, data);
    console.log('Stored offline clock data:', data);
    return data;
  } catch (error) {
    console.error('Failed to store offline clock data:', error);
    throw error;
  }
};

// Get all pending clock data
export const getPendingClockData = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    return await index.getAll('PENDING');
  } catch (error) {
    console.error('Failed to get pending clock data:', error);
    return [];
  }
};

// Update clock data status
export const updateClockDataStatus = async (id, status, error = null) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data = await store.get(id);
    
    if (data) {
      data.status = status;
      data.lastAttempt = new Date().toISOString();
      if (error) data.error = error;
      if (status === 'FAILED') data.retryCount = (data.retryCount || 0) + 1;
      
      await store.put(data);
    }
  } catch (error) {
    console.error('Failed to update clock data status:', error);
  }
};

// Delete synced clock data
export const deleteSyncedClockData = async (id) => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
  } catch (error) {
    console.error('Failed to delete synced clock data:', error);
  }
};

// Get offline shift state
export const getOfflineShiftState = () => {
  try {
    const state = localStorage.getItem('offlineShiftState');
    return state ? JSON.parse(state) : null;
  } catch (error) {
    console.error('Failed to get offline shift state:', error);
    return null;
  }
};

// Set offline shift state
export const setOfflineShiftState = (shiftData) => {
  try {
    localStorage.setItem('offlineShiftState', JSON.stringify(shiftData));
  } catch (error) {
    console.error('Failed to set offline shift state:', error);
  }
};

// Clear offline shift state
export const clearOfflineShiftState = () => {
  try {
    localStorage.removeItem('offlineShiftState');
  } catch (error) {
    console.error('Failed to clear offline shift state:', error);
  }
};

// Check if we're online
export const isOnline = () => {
  return navigator.onLine;
};

// Network status event listeners
export const addNetworkListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
