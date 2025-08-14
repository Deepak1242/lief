"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, isValidElement, cloneElement } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ANALYTICS_ME, CLOCK_IN, CLOCK_OUT, LIST_LOCATIONS, ME, MY_SHIFTS } from "@/graphql/operations";
import { 
  Button, Card, Col, Flex, Form, Input, Row, Space, Statistic, Table, Tag, Tooltip, message, 
  Typography, Divider, Badge, Skeleton, Progress, Alert 
} from 'antd';
import { 
  ClockCircleOutlined, EnvironmentOutlined, 
  CheckCircleOutlined, StopOutlined, 
  LoadingOutlined, CompassOutlined,
  ClockCircleFilled, CheckCircleFilled, 
  InfoCircleOutlined, HistoryOutlined,
  AimOutlined, PauseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// Reusable StyledCard component
const StyledCard = ({ children, title, extra, loading = false, className = '', ...props }) => (
  <Card 
    className={`shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ${className}`}
    title={title && <div className="px-6 pt-4 pb-2 text-lg font-medium">{title}</div>}
    extra={extra}
    {...props}
  >
    <div className="p-6">
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        children
      )}
    </div>
  </Card>
);

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
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          {loading ? (
            <Skeleton.Input active size="large" style={{ width: 60 }} className="mt-2" />
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
    isLoading, 
    isWatching: watchIdRef.current !== null 
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
  const { data: meData, loading: meLoading } = useQuery(ME);
  const { data: locData, loading: locLoading } = useQuery(LIST_LOCATIONS, { 
    variables: { active: true }, 
    fetchPolicy: "cache-and-network" 
  });
  
  // Shift and analytics data with polling
  const { data: shiftsData, loading: shiftsLoading, refetch: refetchShifts } = useQuery(MY_SHIFTS, { 
    fetchPolicy: "network-only", 
    pollInterval: 15000 
  });
  
  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(
    ANALYTICS_ME, 
    { 
      variables: { range: 'week' },
      fetchPolicy: 'cache-and-network'
    }
  );

  // Message API instance
  const [messageApi, contextHolder] = message.useMessage();

  // Track messages to show
  const [messageToShow, setMessageToShow] = useState({ type: '', content: '' });

  // Effect to show messages
  useEffect(() => {
    if (messageToShow.type && messageToShow.content) {
      messageApi[messageToShow.type](messageToShow.content);
      setMessageToShow({ type: '', content: '' });
    }
  }, [messageToShow, messageApi]);

  // Clock in/out mutations with loading states
  const [clockIn, { loading: clockingIn }] = useMutation(CLOCK_IN, { 
    onCompleted: () => { 
      setMessageToShow({ type: 'success', content: 'Successfully clocked in' });
      refetchShifts(); 
      refetchAnalytics(); 
    },
    onError: (err) => {
      console.error("Clock in error:", err);
      const errorMessage = err?.message || 'An unknown error occurred';
      setMessageToShow({ type: 'error', content: `Failed to clock in: ${errorMessage}` });
    }
  });
  
  const [clockOut, { loading: clockingOut }] = useMutation(CLOCK_OUT, { 
    onCompleted: () => { 
      setMessageToShow({ type: 'success', content: 'Successfully clocked out' });
      refetchShifts(); 
      refetchAnalytics(); 
    },
    onError: (err) => {
      console.error("Clock out error:", err);
      message.error(`Failed to clock out: ${err.message}`);
    }
  });

  // Derived state
  const activeLoc = useMemo(() => (locData?.locations?.[0]) || null, [locData]);
  const openShift = useMemo(() => (shiftsData?.shifts || []).find(s => !s.clockOutAt) || null, [shiftsData]);
  const recentShifts = useMemo(() => (shiftsData?.shifts || []).slice(0, 10), [shiftsData]);
  const loading = meLoading || locLoading || shiftsLoading || analyticsLoading;

  // Location tracking state
  const [tracking, setTracking] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const { pos, error: geoError, isLoading: geoLoading, isWatching } = useGeolocation(tracking);
  const [distanceFromWork, setDistanceFromWork] = useState(null);
  const lastStatusRef = useRef(null);

  // Calculate distance from work location and handle auto clock in/out
  useEffect(() => {
    if (pos && activeLoc) {
      const distance = haversineKm(pos.lat, pos.lng, activeLoc.latitude, activeLoc.longitude);
      setDistanceFromWork(distance);
      
      // Auto clock in/out based on location
      const inside = distance <= activeLoc.radiusKm + 0.05; // Small buffer
      const prev = lastStatusRef.current;
      lastStatusRef.current = inside ? "inside" : "outside";

      if (inside !== (prev === "inside")) {
        if (inside && !openShift) {
          clockIn({ 
            variables: { 
              note: `Auto clock-in (${formatDistance(distance)} from work)`, 
              lat: pos.lat, 
              lng: pos.lng 
            } 
          });
        } else if (!inside && openShift) {
          clockOut({ 
            variables: { 
              note: `Auto clock-out (${formatDistance(distance)} from work)`, 
              lat: pos.lat, 
              lng: pos.lng 
            } 
          });
        }
      }
    }
  }, [pos, activeLoc, openShift, clockIn, clockOut]);

  // Calculate stats
  const todayHours = useMemo(() => {
    if (!analyticsData?.analytics) return 0;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const todayData = analyticsData.analytics.find(
      x => new Date(x.date).toDateString() === today.toDateString()
    );
    return todayData?.totalHours || 0;
  }, [analyticsData]);

  const weekHours = useMemo(() => {
    if (!analyticsData?.analytics) return 0;
    return analyticsData.analytics.reduce((sum, day) => sum + (day.totalHours || 0), 0);
  }, [analyticsData]);

  const currentShiftDuration = useMemo(() => {
    if (!openShift?.clockInAt) return 0;
    const start = new Date(openShift.clockInAt);
    const now = new Date();
    return (now - start) / (1000 * 60 * 60); // in hours
  }, [openShift]);

  // Handle clock in/out actions
  const handleClockIn = useCallback(() => {
    if (!pos) {
      message.warning("Waiting for location...");
      return;
    }
    if (openShift) {
      message.info("You're already clocked in");
      return;
    }
    clockIn({ 
      variables: { 
        note: manualNote || `Manual clock-in (${formatDistance(distanceFromWork)} from work)`, 
        lat: pos.lat, 
        lng: pos.lng, 
        manualOverride: true 
      } 
    });
    setManualNote("");
  }, [pos, openShift, manualNote, clockIn, distanceFromWork]);

  const handleClockOut = useCallback(() => {
    if (!pos) {
      message.warning("Waiting for location...");
      return;
    }
    if (!openShift) {
      message.info("No active shift to clock out from");
      return;
    }
    clockOut({ 
      variables: { 
        note: manualNote || `Manual clock-out (${formatDistance(distanceFromWork)} from work)`, 
        lat: pos.lat, 
        lng: pos.lng, 
        manualOverride: true 
      } 
    });
    setManualNote("");
  }, [pos, openShift, manualNote, clockOut, distanceFromWork]);

  // Toggle location tracking
  const toggleTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      message.error("Geolocation is not supported by your browser");
      return;
    }
    setTracking(prev => !prev);
  }, []);

  // Table columns for shift history
  const columnsLogs = [
    {
      title: 'Date',
      dataIndex: 'clockInAt',
      key: 'date',
      render: (text) => formatDateTime(text),
      sorter: (a, b) => new Date(a.clockInAt) - new Date(b.clockInAt),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => {
        if (!record.clockOutAt) return 'In Progress';
        const duration = (new Date(record.clockOutAt) - new Date(record.clockInAt)) / (1000 * 60); // in minutes
        return formatDuration(duration);
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={!record.clockOutAt ? 'green' : 'default'}>
          {!record.clockOutAt ? 'Active' : 'Completed'}
        </Tag>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'clockInNote',
      key: 'notes',
      render: (text, record) => (
        <div className="max-w-xs truncate" title={`${text || ''}${record.clockOutNote ? ` | ${record.clockOutNote}` : ''}`}>
          {text || '--'}
          {record.clockOutNote && ' | ' + record.clockOutNote}
        </div>
      ),
    },
  ];

  // Render loading state
  if (loading) {
    return (
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  // Render error state if location access is blocked
  if (geoError && !pos) {
    return (
      <div className="p-6">
        <Alert
          message="Location Access Required"
          description="Please enable location services to use the clock in/out features."
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={toggleTracking}>
              Enable Location
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="mb-2">Worker Dashboard</Title>
        <Text type="secondary">
          {openShift 
            ? `Clocked in at ${formatTime(openShift.clockInAt)}`
            : 'Ready to clock in'}
        </Text>
      </div>

      {/* Status Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <StatCard 
            title={openShift ? "Current Shift" : "Status"}
            value={openShift ? formatDuration(currentShiftDuration * 60) : "Clocked Out"}
            icon={openShift ? <ClockCircleFilled /> : <StopOutlined />}
            color={openShift ? "blue" : "gray"}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard 
            title="Today"
            value={todayHours.toFixed(1)}
            suffix="hours"
            icon={<ClockCircleOutlined />}
            color="green"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard 
            title="This Week"
            value={weekHours.toFixed(1)}
            suffix="hours"
            icon={<HistoryOutlined />}
            color="purple"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard 
            title="Distance from Work"
            value={distanceFromWork !== null ? formatDistance(distanceFromWork) : '--'}
            icon={<EnvironmentOutlined />}
            color={activeLoc && distanceFromWork <= activeLoc.radiusKm ? 'green' : 'orange'}
            loading={geoLoading || !pos}
          />
        </Col>
      </Row>

      {/* Clock In/Out Controls */}
      <StyledCard 
        title="Time Clock" 
        className="mb-6"
        loading={loading}
      />
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <Input
                placeholder="Add a note (optional)"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                onPressEnter={openShift ? handleClockOut : handleClockIn}
                disabled={clockingIn || clockingOut}
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                type={!openShift ? "primary" : "default"}
                size="large"
                icon={!openShift ? <CheckCircleOutlined /> : <PauseCircleOutlined />}
                loading={clockingIn}
                onClick={handleClockIn}
                disabled={!!openShift || clockingOut || !pos}
                className="flex-1 sm:flex-none"
              >
                {!openShift ? 'Clock In' : 'Clocked In'}
              </Button>
              <Button 
                type={openShift ? "primary" : "default"}
                danger={!!openShift}
                size="large"
                icon={<StopOutlined />}
                loading={clockingOut}
                onClick={handleClockOut}
                disabled={!openShift || clockingIn || !pos}
                className="flex-1 sm:flex-none"
              >
                Clock Out
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-500">
              {geoLoading ? (
                <span className="flex items-center">
                  <LoadingOutlined className="mr-2" />
                  Getting location...
                </span>
              ) : pos ? (
                <span className="flex items-center">
                  <CheckCircleOutlined className="text-green-500 mr-2" />
                  Location: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                    ±{pos.accuracy ? Math.round(pos.accuracy) : '?'}m
                  </span>
                </span>
              ) : (
                <span className="flex items-center">
                  <InfoCircleOutlined className="text-orange-500 mr-2" />
                  Location not available
                </span>
              )}
            </div>
            <Tooltip title={tracking ? 'Stop location tracking' : 'Track my location'}>
              <Button 
                type={tracking ? 'primary' : 'default'} 
                icon={<AimOutlined />}
                onClick={toggleTracking}
                size="small"
              >
                {tracking ? 'Tracking' : 'Track'}
              </Button>
            </Tooltip>
          </div>
        </div>
      {/* </StyledCard> */}

      {/* Shift History */}
      <StyledCard 
        title="Recent Shifts" 
        className="mb-6"
        loading={loading}
      >
        <Table 
          rowKey="id"
          columns={columnsLogs}
          dataSource={recentShifts}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          size="middle"
        />
      </StyledCard>

      {/* Work Location Info */}
      {activeLoc && (
        <StyledCard title="Work Location" className="mb-6">
          <div className="space-y-2">
            <div className="flex items-center">
              <EnvironmentOutlined className="mr-2 text-blue-500" />
              <span className="font-medium">{activeLoc.name}</span>
            </div>
            <div className="text-sm text-gray-600">
              {activeLoc.address}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Radius: </span>
              <span>{activeLoc.radiusKm} km</span>
            </div>
            {distanceFromWork !== null && (
              <div className="text-sm">
                <span className="text-gray-500">Distance: </span>
                <span className={distanceFromWork <= activeLoc.radiusKm ? 'text-green-600' : 'text-orange-600'}>
                  {formatDistance(distanceFromWork)} {distanceFromWork <= activeLoc.radiusKm ? 'inside' : 'outside'} work area
                </span>
              </div>
            )}
          </div>
        </StyledCard>
      )}

      {/* Location Tracking Status */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${tracking ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm font-medium">
              {tracking ? 'Location tracking active' : 'Location tracking off'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {tracking 
              ? 'Your location is being tracked for auto clock in/out' 
              : 'Enable tracking for automatic clock in/out when you arrive/leave work'}
          </div>
        </div>
      </div>
    </div>
  );
}
