"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, isValidElement, cloneElement } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CLOCK_IN, CLOCK_OUT, LIST_LOCATIONS, ME, MY_SHIFTS } from "@/graphql/operations";
import { useOfflineClockIn } from '../hooks/useOfflineClockIn';
import { useBackgroundSync } from '../hooks/useBackgroundSync';
import BackgroundSettings from './BackgroundSettings';
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, ChartTooltip, Legend, Filler);

// Blocking Dialog Component
const LocationRequiredDialog = ({ onRetry }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Location Access Required</h3>
        <p className="text-sm text-gray-500 mb-6">
          To use the clock in/out feature, you need to enable location access in your browser settings.
          Please enable location permissions and refresh the page.
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <button
            onClick={onRetry}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            I&apos;ve Enabled Location
          </button>
          <a
            href="https://support.google.com/chrome/answer/142065"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            How to Enable Location
          </a>
        </div>
      </div>
    </div>
  </div>
);

// Inline SVG icons
const IconLocation = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/>
  </svg>
);
const IconClock = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const IconHistory = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 3"/>
  </svg>
);
const IconStop = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);
const IconPause = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>
  </svg>
);
const IconCheck = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m20 6-11 11-5-5"/>
  </svg>
);
const IconInfo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);
const IconAim = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconSpinner = ({ className = "w-4 h-4" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
    <path d="M22 12a10 10 0 0 1-10 10" fill="currentColor"/>
  </svg>
);

// Reusable StyledCard component (Tailwind-only)
const StyledCard = ({ children, title, extra, loading = false, className = '', gradient = false }) => {
  const inner = (
    <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      {(title || extra) && (
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          {title && <div className="text-lg font-medium">{title}</div>}
          {extra}
        </div>
      )}
      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200/70 rounded animate-pulse" />
            <div className="h-4 bg-gray-200/70 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-gray-200/70 rounded animate-pulse w-4/6" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
  if (!gradient) return inner;
  return <div className="rounded-2xl mt-4 p-[1px] bg-gradient-to-br from-blue-300 via-white to-blue-300">{inner}</div>;
};

// Reusable StatCard component
// Color mapping for dynamic colors
const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500' },
  green: { bg: 'bg-green-50', text: 'text-green-500' },
  red: { bg: 'bg-red-50', text: 'text-red-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500' },
  // Add more colors as needed
  default: { bg: 'bg-gray-50', text: 'text-gray-500' }
};

// Header section
const StatusHeader = ({ openShift, formatTime, currentTimeText }) => (
  <div className="mb-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 items-center">
      <div className="sm:justify-self-start justify-self-center flex items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent m-0 leading-none">Worker Dashboard</h1>
        <span className="hidden sm:inline-flex items-center justify-center w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden />
      </div>
      <div className="justify-self-center mt-3 sm:mt-0 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium shadow-sm ${openShift ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
          {openShift 
            ? `Clocked in at ${formatTime(openShift.clockInAt)}`
            : 'Ready to clock in'}
        </span>
      </div>
      <div className="sm:justify-self-end justify-self-center mt-3 sm:mt-0">
        <div className="inline-flex items-baseline gap-2 px-3 py-1 rounded-md bg-gray-50 border border-gray-100 shadow-sm">
          <span className="font-mono text-gray-800 text-lg sm:text-xl font-semibold tracking-tight">{currentTimeText}</span>
        </div>
      </div>
    </div>
  </div>
);

// Compact location status card with glowing icon when inside perimeter
const LocationStatusCard = ({ inside }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 h-full">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-500">Location Status</div>
        <div className={`mt-1 text-base font-semibold ${inside ? 'text-green-600' : 'text-gray-700'}`}>
          {inside ? 'Inside Work Area' : 'Outside Work Area'}
        </div>
      </div>
      <div className={`relative p-3 rounded-full ${inside ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400'}`}>
        <IconLocation className="w-5 h-5" />
        {inside && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
        )}
      </div>
    </div>
  </div>
);

// Stats grid wrapper
const StatsGrid = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">{children}</div>
);

// Enhanced Time Clock section
const presetNotes = [
  'Starting shift',
  'Lunch break',
  'Back from break',
  'Leaving site',
  'At client location'
];

const ClockInOutCard = ({ 
  openShift, 
  pos, 
  geoLoading,
  manualNote,
  setManualNote,
  handleClockIn,
  handleClockOut,
  clockingIn,
  clockingOut,
  isOffline,
  pendingSyncCount
}) => (
  <StyledCard title="Time Clock" className="mb-10" loading={loading} gradient>
    <div className="space-y-4">
      {/* Offline status indicator */}
      {isOffline && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Working Offline</span>
          </div>
          {pendingSyncCount > 0 && (
            <p className="text-sm text-orange-600 mt-1">
              {pendingSyncCount} clock entries pending sync
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col items-stretch gap-4">
        <div className="w-full">
          <input
            placeholder="Add a note (optional)"
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { (openShift ? handleClockOut : handleClockIn)(); } }}
            disabled={clockingIn || clockingOut || !pos}
            className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {presetNotes.map((n) => (
              <span
                key={n}
                className="cursor-pointer m-0 px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200"
                onClick={() => setManualNote((prev) => prev ? `${prev} ${n}` : n)}
              >{n}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full">
          <button
            onClick={handleClockIn}
            disabled={!!openShift || clockingOut || !pos}
            className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-md text-white ${(!openShift && pos ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed')}`}
            title={!pos ? 'Location required' : !openShift ? 'Clock In' : 'Already clocked in'}
          >
            {!openShift ? <IconCheck className="w-5 h-5"/> : <IconPause className="w-5 h-5"/>}
            {!openShift ? 'Clock In' : 'Clocked In'}
          </button>
          <button
            onClick={handleClockOut}
            disabled={!openShift || clockingIn || !pos}
            className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 px-6 rounded-md text-white ${(openShift && pos ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed')}`}
            title={!pos ? 'Location required' : openShift ? 'Clock Out' : 'No active shift'}
          >
            <IconStop className="w-5 h-5"/>
            Clock Out
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center text-sm text-gray-500 pt-2 border-t border-gray-100">
        {geoLoading ? (
          <span className="flex items-center"><IconSpinner className="w-4 h-4 mr-2"/>Getting location...</span>
        ) : pos ? (
          <span className="flex items-center"><IconCheck className="w-4 h-4 mr-2 text-green-500"/>Location: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}<span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">±{pos.accuracy ? Math.round(pos.accuracy) : '?'}m</span></span>
        ) : (
          <span className="flex items-center"><IconInfo className="w-4 h-4 mr-2 text-orange-500"/>Location access required for clock in/out</span>
        )}
      </div>
    </div>
  </StyledCard>
);

// Recent shifts table (Tailwind)
const RecentShiftsTable = ({ loading, data }) => (
  <StyledCard title="Recent Shifts" className="mb-8 mt-2" loading={loading} gradient>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {(data || []).slice(0,5).map((record) => (
            <tr key={record.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-2">{formatDateTime(record.clockInAt)}</td>
              <td className="px-4 py-2">{!record.clockOutAt ? 'In Progress' : formatDuration((new Date(record.clockOutAt) - new Date(record.clockInAt)) / (1000 * 60))}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${!record.clockOutAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {!record.clockOutAt ? 'Active' : 'Completed'}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="max-w-xs truncate" title={`${record.clockInNote || ''}${record.clockOutNote ? ` | ${record.clockOutNote}` : ''}`}>
                  {record.clockInNote || '--'}{record.clockOutNote && ` | ${record.clockOutNote}`}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </StyledCard>
);

// Work location info
const WorkLocationCard = ({ activeLoc }) => (
  <StyledCard title="Work Location" className="mb-6" gradient>
    <div className="space-y-2">
      <div className="flex items-center">
        <IconLocation className="w-5 h-5 mr-2 text-blue-500" />
        <span className="font-medium">{activeLoc.name}</span>
      </div>
      <div className="text-sm">
        <span className="text-gray-500">Radius: </span>
        <span>{activeLoc.radiusKm} km</span>
      </div>
    </div>
  </StyledCard>
);

// Tracking status footer
const TrackingStatusBar = ({ pos }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${pos ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm font-medium">
          {pos ? 'Location tracking active' : 'Location access required'}
        </span>
      </div>
      <div className="text-xs text-gray-500">
        {pos 
          ? 'Your location is being tracked for auto clock in/out' 
          : 'Please enable location access in your browser settings to use clock in/out features'}
      </div>
    </div>
  </div>
);

const StatCard = ({ 
  title = '', 
  value = '', 
  icon = <div className="w-6 h-6" />, // Default empty icon
  color = 'blue', 
  suffix = '', 
  loading = false 
}) => {
  const colors = colorMap[color] || colorMap.default;
  
  // Safely render icon
  const renderIcon = () => {
    if (!isValidElement(icon)) {
      return <div className={`w-6 h-6 ${colors.text}`} />;
    }
    return cloneElement(icon, { 
      className: `text-lg ${colors.text} ${icon.props.className || ''}`.trim()
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 h-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          {loading ? (
            <div className="mt-2 h-6 w-16 bg-gray-200 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline mt-1">
              <span className="text-2xl font-semibold">{value}</span>
              {suffix && <span className="ml-1 text-sm text-gray-500">{suffix}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.bg}`}>
          {renderIcon()}
        </div>
      </div>
    </div>
  );
};

function useGeolocation(enabled) {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearWatch();
      setPos(null);
      setError(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    
    // First try to get a quick position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.warn("Initial geolocation error:", err);
        setError(`Unable to get location: ${err.message}`);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Then set up the watcher for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setError(`Location error: ${err.message}`);
        setIsLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 10000, 
        timeout: 10000 
      }
    );

    return () => {
      clearWatch();
    };
  }, [enabled, clearWatch]);

  return { 
    pos, 
    error, 
    isLoading 
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371; // Earth's radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format distance for display
const formatDistance = (km) => {
  if (km === null || km === undefined) return '--';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

// Format time duration
const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

// Format date to a readable time
const formatTime = (dateString) => {
  if (!dateString) return '--:--';
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format full date and time
const formatDateTime = (dateString) => {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function WorkerDashboard() {
  // User and location data
  const { data: meData, loading: meLoading } = useQuery(ME, {
    fetchPolicy: "cache-first" // User data is relatively static
  });
  const { data: locData, loading: locLoading } = useQuery(LIST_LOCATIONS, { 
    variables: { active: true }, 
    fetchPolicy: "cache-first" // Locations are static data
  });
  
  // Shift and analytics data with optimized polling (60s instead of 15s)
  const { data: shiftsData, loading: shiftsLoading, refetch: refetchShifts } = useQuery(MY_SHIFTS, { 
    fetchPolicy: "cache-and-network", 
    pollInterval: 60000 
  });
  
  // Analytics range state and query
  const [range, setRange] = useState('month'); // day | month | year | custom
  const [customStart, setCustomStart] = useState(null); // YYYY-MM-DD
  const getDateRange = useCallback((r, custom) => {
    // Always set end to the end of the current day to include all data for today
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    let start;
    switch (r) {
      case 'day': {
        // For 'day', set start to beginning of today
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'year': {
        // For 'year', set start to exactly 1 year ago from today
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'custom': {
        // For custom date, use the provided date or default to 30 days ago
        start = custom ? new Date(custom) : new Date();
        if (!custom) {
          start.setDate(start.getDate() - 30);
        }
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
      default: {
        // For 'month', set start to exactly 30 days ago
        start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
      }
    }
    return { start, end };
  }, []);
  const dateRange = useMemo(() => getDateRange(range, customStart), [range, customStart, getDateRange]);
  // Analytics are computed from shifts for accuracy and immediate updates

  // Simple notify helper (replace antd message)
  const notify = useCallback((type, text) => {
    const fn = type === 'error' ? console.error : console.log;
    fn(text);
  }, []);

  // Use offline clock in/out hook
  const {
    clockIn: handleClockIn,
    clockOut: handleClockOut,
    clockingIn,
    clockingOut,
    isOffline,
    pendingSyncCount,
    localOpenShift,
  } = useOfflineClockIn();

  // Use background sync hook
  const {
    isBackgroundEnabled,
    backgroundStatus,
    syncEvents,
    enableBackgroundTracking,
    disableBackgroundTracking,
    triggerSync,
    showNotification
  } = useBackgroundSync();

  // Enable background tracking when component mounts
  useEffect(() => {
    if (meData?.me && activeLoc && backgroundStatus.isInitialized) {
      enableBackgroundTracking({
        workLocation: {
          latitude: activeLoc.latitude,
          longitude: activeLoc.longitude,
          radiusKm: activeLoc.radiusKm
        },
        hasOpenShift: !!openShift,
        lastLocationStatus: pos && activeLoc ? 
          (haversineKm(pos.lat, pos.lng, activeLoc.latitude, activeLoc.longitude) <= activeLoc.radiusKm + 0.05 ? 'inside' : 'outside') : 
          'unknown'
      });
    }
  }, [meData?.me, activeLoc, backgroundStatus.isInitialized, enableBackgroundTracking, openShift, pos]);

  // Derived state - use local shift when offline
  const activeLoc = useMemo(() => (locData?.locations?.[0]) || null, [locData]);
  const openShift = useMemo(() => {
    // Use local shift state when offline or when we have pending offline data
    if (localOpenShift) return localOpenShift;
    return (shiftsData?.shifts || []).find(s => !s.clockOutAt) || null;
  }, [shiftsData, localOpenShift]);
  const recentShifts = useMemo(() => (shiftsData?.shifts || []).slice(0, 10), [shiftsData]);
  const loading = meLoading || locLoading || shiftsLoading;
  const [metric, setMetric] = useState('hours'); // 'hours' | 'entries'

  // Location tracking state
  const [locationDenied, setLocationDenied] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [manualNote, setManualNote] = useState("");
  // Always enable location tracking
  const { pos, error: geoError, isLoading: geoLoading } = useGeolocation(true);
  const [distanceFromWork, setDistanceFromWork] = useState(null);
  const lastStatusRef = useRef(null);
  const locationChecked = useRef(false);

  // Check location permissions on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          const isDenied = permissionStatus.state === 'denied';
          setLocationDenied(isDenied);
          setShowLocationDialog(isDenied);
          locationChecked.current = true;
          
          permissionStatus.onchange = () => {
            const newState = permissionStatus.state === 'denied';
            setLocationDenied(newState);
            setShowLocationDialog(newState);
          };
        });
    } else {
      setLocationDenied(true);
      setShowLocationDialog(true);
      locationChecked.current = true;
    }
  }, []);

  // Handle geolocation errors
  useEffect(() => {
    if (geoError) {
      console.error('Geolocation error:', geoError);
      if (geoError.code === 1) { // PERMISSION_DENIED
        setLocationDenied(true);
        setShowLocationDialog(true);
      }
    }
  }, [geoError]);

  const handleRetryLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Success
          setLocationDenied(false);
          setShowLocationDialog(false);
        },
        (error) => {
          // Still denied
          console.error('Location access still denied:', error);
        }
      );
    }
  };

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const currentTimeText = useMemo(() => (
    now.toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  ), [now]);

  // Calculate distance from work location and handle auto clock in/out
  useEffect(() => {
    if (pos && activeLoc) {
      const distance = haversineKm(pos.lat, pos.lng, activeLoc.latitude, activeLoc.longitude);
      setDistanceFromWork(distance);
    }
  }, [pos, activeLoc]);

  useEffect(() => {
    if (pos && activeLoc) {
      const distance = haversineKm(pos.lat, pos.lng, activeLoc.latitude, activeLoc.longitude);
      const inside = distance <= activeLoc.radiusKm + 0.05; // 50m buffer
      const prev = lastStatusRef.current;
      lastStatusRef.current = inside ? "inside" : "outside";

      if (inside !== (prev === "inside")) {
        if (inside && !openShift) {
          handleClockIn({ variables: { note: `Auto clock-in (${formatDistance(distance)} from work)`, lat: pos.lat, lng: pos.lng } });
        } else if (!inside && openShift) {
          handleClockOut({ variables: { note: `Auto clock-out (${formatDistance(distance)} from work)`, lat: pos.lat, lng: pos.lng } });
        }
      }
    }
  }, [pos, activeLoc, openShift, handleClockIn, handleClockOut]);

  // Calculate hours for a shift (exclude ongoing)
  const calculateShiftHours = (shift) => {
    if (!shift?.clockOutAt) return 0;
    const startDt = new Date(shift.clockInAt);
    const endDt = new Date(shift.clockOutAt);
    return Math.max(0, (endDt - startDt) / 3600000); // hours
  };

  // Generate date range with data calculated from actual shifts
  const getDateRangeWithShiftData = (start, end, shifts) => {
    const dateMap = new Map();
    (shifts || []).forEach(shift => {
      if (!shift.clockOutAt) return; // Skip ongoing shifts
      const shiftDate = new Date(shift.clockInAt);
      const dateKey = shiftDate.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { hours: 0, count: 0 });
      }
      const dayData = dateMap.get(dateKey);
      dayData.hours += calculateShiftHours(shift);
      dayData.count += 1;
    });

    const result = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const data = dateMap.get(dateKey) || { hours: 0, count: 0 };
      result.push({
        date: new Date(current),
        ...data
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  };

  // Process analytics data with zero-fill and proper date handling
  const { processedAnalytics, daysWithData } = useMemo(() => {
    const shifts = shiftsData?.shifts || [];

    const start = new Date(dateRange.start); start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999);

    const inRange = shifts.filter(s => {
      const t = new Date(s.clockInAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    // Always build zero-filled series so the chart renders even with no shifts
    const data = getDateRangeWithShiftData(start, end, inRange);
    const daysWithDataCount = data.filter(d => d.hours > 0).length;
    
    return {
      processedAnalytics: data,
      daysWithData: daysWithDataCount > 0 ? daysWithDataCount : 1 // Avoid division by zero
    };
  }, [shiftsData, dateRange]);

  // Calculate all metrics in a single useMemo for consistency
  const { todayHours, periodHours, periodEntries, avgHours } = useMemo(() => {
    // Get today's date and format it for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's data by comparing date objects properly
    const todayData = processedAnalytics.find(x => {
      const itemDate = new Date(x.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === today.getTime();
    }) || { hours: 0 };
    
    const hours = processedAnalytics.reduce((sum, day) => sum + (day.hours || 0), 0);
    const entries = processedAnalytics.reduce((sum, day) => sum + (day.count || 0), 0);
    const avg = daysWithData > 0 ? hours / daysWithData : 0;
    
    return {
      todayHours: todayData.hours || 0,
      periodHours: hours,
      periodEntries: entries,
      avgHours: avg
    };
  }, [processedAnalytics, daysWithData]);

  // Build mini chart data for worker
  const workerChart = useMemo(() => {
    // Format dates consistently for display
    const labels = processedAnalytics.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Get values based on selected metric
    const values = processedAnalytics.map(item => 
      metric === 'hours' ? item.hours : item.count
    );

    // For 'day' range, highlight today's data point
    const pointBackgroundColors = range === 'day' ? 
      processedAnalytics.map(item => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime() ? '#4361ee' : 'rgba(67, 97, 238, 0.6)';
      }) : undefined;

    return {
      labels,
      datasets: [
        {
          label: metric === 'hours' ? 'Daily Hours' : 'Daily Entries',
          data: values,
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67, 97, 238, 0.15)',
          pointBackgroundColor: pointBackgroundColors,
          pointRadius: range === 'day' ? 4 : 3,
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [processedAnalytics, metric, range]);

  // Define theme for chart styling
  const theme = {
    textSecondary: '#64748b', // Tailwind slate-500
    gridLine: 'rgba(0, 0, 0, 0.03)'
  };

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label: function(context) {
            const value = context.raw || 0;
            if (metric === 'hours') {
              return `${value.toFixed(2)} hours`;
            }
            return `${value} ${value === 1 ? 'entry' : 'entries'}`;
          }
        }
      },
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { 
          color: theme.textSecondary,
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10
        } 
      },
      y: { 
        grid: { color: 'rgba(0, 0, 0, 0.03)' }, 
        ticks: { 
          color: theme.textSecondary,
          callback: function(value) {
            if (metric === 'hours') {
              const num = Number(value) || 0;
              return num > 0 ? `${num.toFixed(1)}h` : '0h';
            }
            return value;
          }
        },
        beginAtZero: true,
        title: {
          display: true,
          text: metric === 'hours' ? 'Hours' : 'Entries',
          color: theme.textSecondary
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
        hoverBorderWidth: 2
      }
    }
  }), [metric, theme]);

  const currentShiftDuration = useMemo(() => {
    if (!openShift?.clockInAt) return 0;
    const start = new Date(openShift.clockInAt);
    const now = new Date();
    return (now - start) / (1000 * 60 * 60); // in hours
  }, [openShift]);


  // Tailwind table renders shift history directly

  // Render loading state
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  // Render error state if location access is blocked
  if (geoError && !pos) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <IconInfo className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-medium text-red-700">Location Access Required</div>
              <div className="text-sm text-red-700/90">Please enable location services to use the clock in/out features.</div>
              <div className="text-sm text-red-700/90 mt-2">You can still view other dashboard features, but clock in/out functionality is disabled until location access is granted.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking location permissions
  if (!locationChecked.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking location access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-blue-200 via-blue-100 to-transparent relative">
      {showLocationDialog && (
        <LocationRequiredDialog onRetry={handleRetryLocation} />
      )}
      {showLocationDialog ? null : (
        <div>
          <StatusHeader openShift={openShift} formatTime={formatTime} currentTimeText={currentTimeText} />

          {/* Status Cards */}
          <StatsGrid>
            <div>
              <StatCard 
                title={openShift ? "Current Shift" : "Status"}
                value={openShift ? formatDuration(currentShiftDuration * 60) : "Ready"}
                icon={<IconClock />}
                color={openShift ? "blue" : "green"}
              />
            </div>
            <div>
              <StatCard
                title="Total Hours (Range)"
                value={formatDuration(periodHours * 60)}
                icon={<IconClock />}
                color="blue"
              />
            </div>
            <div>
              <StatCard
                title="Total Shifts (Range)"
                value={periodEntries}
                suffix="shifts"
                icon={<IconHistory />}
                color="purple"
              />
            </div>
          </StatsGrid>

          <ClockInOutCard
            loading={loading}
            openShift={openShift}
            pos={pos}
            geoLoading={geoLoading}
            manualNote={manualNote}
            setManualNote={setManualNote}
            handleClockIn={handleClockIn}
            handleClockOut={handleClockOut}
            clockingIn={clockingIn}
            clockingOut={clockingOut}
            isOffline={isOffline}
            pendingSyncCount={pendingSyncCount}
          />

          {/* Background Settings */}
          <BackgroundSettings />

          {/* My Activity Chart */}
          <StyledCard 
            title="My Activity" 
            extra={(
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                  <button
                    onClick={() => setMetric('hours')}
                    className={`px-2 py-1 text-xs rounded ${metric === 'hours' ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
                  >Hours</button>
                  <button
                    onClick={() => setMetric('entries')}
                    className={`px-2 py-1 text-xs rounded ${metric === 'entries' ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
                  >Entries</button>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    className="border rounded px-2 py-1 text-xs bg-white"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    title="Select range"
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                    <option value="custom">Custom</option>
                  </select>
                  {range === 'custom' && (
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-xs"
                      max={new Date().toISOString().split('T')[0]}
                      value={customStart || ''}
                      onChange={(e) => setCustomStart(e.target.value || null)}
                    />
                  )}
                </div>
              </div>
            )}
            className="mb-8"
            gradient
          >
            <div className="h-64">
              {processedAnalytics.length > 0 ? (
                <Line data={workerChart} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">No data in the selected range</div>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 text-right">
              Showing {processedAnalytics.length} days from {dateRange.start.toLocaleDateString()} to {dateRange.end.toLocaleDateString()}
            </div>
          </StyledCard>

          {/* Shift History */}
          <RecentShiftsTable loading={loading} data={recentShifts} />

          {/* Work Location Info */}
          {activeLoc && (
            <WorkLocationCard activeLoc={activeLoc} />
          )}

          {/* Location Tracking Status */}
          <TrackingStatusBar pos={pos} />
        </div>
      )}
    </div>
  );
}
