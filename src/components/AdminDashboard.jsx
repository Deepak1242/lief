"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { 
  Button, Card, Col, Divider, Flex, Form, Input, InputNumber, Row, Table, 
  Tag, Typography, message, Badge, Avatar, Statistic, Space, Tooltip, Skeleton,
  Select, DatePicker 
} from "antd";
import { 
  ClockCircleOutlined, EnvironmentOutlined, TeamOutlined, BarChartOutlined,
  UserAddOutlined, CheckCircleOutlined, UserSwitchOutlined,
  DeleteOutlined, AimOutlined
} from "@ant-design/icons";
import { 
  CURRENTLY_CLOCKED_IN, LIST_LOCATIONS, SET_ACTIVE_LOCATION, 
  UPSERT_LOCATION, USERS, DELETE_USER, PROMOTE_USER, DASHBOARD_STATS, DELETE_LOCATION
} from "@/graphql/operations";
import Link from "next/link";
// React hooks are imported from default React import above
import { Line, Bar } from "react-chartjs-2";
import { 
  Chart as ChartJS, LineElement, BarElement, CategoryScale, LinearScale, 
  PointElement, Tooltip as ChartTooltip, Legend, Filler 
} from "chart.js";

// Register ChartJS components
ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, ChartTooltip, Legend, Filler);

// Theme configuration
const theme = {
  primary: '#4361ee',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  cardBg: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0'
};

// Styled components
const StyledCard = ({ title, children, icon, className = '', ...props }) => (
  <Card 
    {...props}
    className={`shadow-sm hover:shadow-md transition-all duration-200 border-0 ${className}`}
    headStyle={{ 
      borderBottom: `1px solid ${theme.border}`,
      padding: '0 16px',
      minHeight: '56px',
      display: 'flex',
      alignItems: 'center'
    }}
    bodyStyle={{ padding: '16px' }}
    title={
      <div className="flex items-center gap-2 font-medium text-gray-800">
        {icon}
        {title}
      </div>
    }
  >
    {children}
  </Card>
);

const StatCard = ({ title, value, icon, color, trend, trendText, loading }) => (
  <StyledCard className="h-full">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
        {loading ? (
          <Skeleton.Input active size="large" className="w-16" />
        ) : (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        )}
        {trend && (
          <div className={`text-xs mt-1 flex items-center ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}% {trendText}
          </div>
        )}
      </div>
      <div className={`p-2 rounded-lg bg-${color}-50`}>
        {React.cloneElement(icon, { 
          className: `text-xl text-${color}-500` 
        })}
      </div>
    </div>
  </StyledCard>
);

export default function AdminDashboard() {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('overview');
  const [locating, setLocating] = useState(false);
  const [editLocId, setEditLocId] = useState(null);
  const [timeRange, setTimeRange] = useState('weekly');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [metric, setMetric] = useState('entries'); // 'entries' | 'hours'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data fetching
  const { data: locData, loading: loadingLocations, refetch: refetchLocs } = useQuery(LIST_LOCATIONS, {
    fetchPolicy: 'cache-first' // Locations are relatively static
  });
  const { data: clockedData, loading: loadingClockedIn, startPolling, stopPolling } = useQuery(CURRENTLY_CLOCKED_IN, { pollInterval: 0 });
  const { data: usersData, loading: loadingUsers, refetch: refetchUsers } = useQuery(USERS, { 
    variables: { search: searchTerm },
    fetchPolicy: 'cache-and-network'
  });

  // Debounced search function to prevent excessive API calls
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (value) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearchTerm(value);
        }, 500);
      };
    })(),
    []
  );
  const { data: statsData, loading: loadingStats } = useQuery(DASHBOARD_STATS, {
    fetchPolicy: 'cache-first',
    pollInterval: 300000 // Refresh dashboard stats every 5 minutes instead of real-time
  });

  // Live update currently clocked in every 30s (optimized from 10s)
  useEffect(() => {
    startPolling(30000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  

  // Calculate date ranges based on selected time range
  const getDateRange = (range, customStart) => {
    // Always set end to the end of the current day to include all data for today
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    let start;
    
    if (range === 'custom' && customStart) {
      const cs = (customStart && typeof customStart.toDate === 'function') ? customStart.toDate() : customStart;
      start = new Date(cs);
      // Set to beginning of the day
      start.setHours(0, 0, 0, 0);
    } else {
      switch (range) {
        case 'today':
          start = new Date();
          start.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
        case 'week':
          start = new Date();
          start.setDate(start.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
        case 'month':
          start = new Date();
          start.setDate(start.getDate() - 30);
          start.setHours(0, 0, 0, 0);
          break;
        case 'yearly':
        case 'year':
          start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          start.setHours(0, 0, 0, 0);
          break;
        default:
          start = new Date();
          start.setDate(start.getDate() - 7);
          start.setHours(0, 0, 0, 0);
      }
    }
    
    return { start, end };
  };

  // Main dashboard date range
  const mainDateRange = useMemo(() => getDateRange(timeRange, customStartDate), [timeRange, customStartDate]);
  
  

  

  // Mutations
  const [upsertLocation, { loading: savingLoc }] = useMutation(UPSERT_LOCATION, {
    onCompleted: () => { 
      message.success("Location saved successfully"); 
      setEditLocId(null);
      form.resetFields();
    },
    // Use Apollo's cache update instead of refetch for better performance
    update: (cache, { data: { upsertLocation } }) => {
      const existingLocations = cache.readQuery({ query: LIST_LOCATIONS });
      if (existingLocations) {
        const updatedLocations = existingLocations.locations.some(loc => loc.id === upsertLocation.id)
          ? existingLocations.locations.map(loc => loc.id === upsertLocation.id ? upsertLocation : loc)
          : [...existingLocations.locations, upsertLocation];
        cache.writeQuery({
          query: LIST_LOCATIONS,
          data: { locations: updatedLocations }
        });
      }
    }
  });
  
  const [setActiveLocation, { loading: settingActive }] = useMutation(SET_ACTIVE_LOCATION, {
    onCompleted: () => { 
      message.success("Active location updated"); 
    },
    // Update cache instead of refetch
    update: (cache, { data: { setActiveLocation } }) => {
      const existingLocations = cache.readQuery({ query: LIST_LOCATIONS });
      if (existingLocations) {
        const updatedLocations = existingLocations.locations.map(loc => ({
          ...loc,
          active: loc.id === setActiveLocation.id
        }));
        cache.writeQuery({
          query: LIST_LOCATIONS,
          data: { locations: updatedLocations }
        });
      }
    }
  });

  const [deleteLocation, { loading: deletingLoc }] = useMutation(DELETE_LOCATION, {
    onCompleted: () => {
      message.success("Location deleted");
      if (editLocId) {
        setEditLocId(null);
        form.resetFields();
      }
    },
    // Update cache instead of refetch
    update: (cache, { data }, { variables }) => {
      const existingLocations = cache.readQuery({ query: LIST_LOCATIONS });
      if (existingLocations) {
        const updatedLocations = existingLocations.locations.filter(loc => loc.id !== variables.id);
        cache.writeQuery({
          query: LIST_LOCATIONS,
          data: { locations: updatedLocations }
        });
      }
    }
  });
  
  const [deleteUser] = useMutation(DELETE_USER, { 
    onCompleted: () => { 
      message.success("User removed successfully"); 
      refetchUsers(); 
    } 
  });
  
  const [promoteUser] = useMutation(PROMOTE_USER, { 
    onCompleted: () => { 
      message.success("User role updated"); 
      refetchUsers(); 
    } 
  });

  // Derived state
  const careWorkers = useMemo(() => usersData?.users?.filter(u => u.role === 'CAREWORKER') || [], [usersData]);
  const admins = useMemo(() => usersData?.users?.filter(u => u.role === 'ADMIN') || [], [usersData]);
  const totalUsers = useMemo(() => (usersData?.users || []).length, [usersData]);
  const workersCount = useMemo(() => careWorkers.length, [careWorkers]);
  const adminsCount = useMemo(() => admins.length, [admins]);
  // Build a unique, latest-first list of currently clocked-in users (safety net if API ever returns dup shifts)
  const uniqueClockedIn = useMemo(() => {
    const list = (clockedData?.currentlyClockedIn || [])
      .slice()
      .sort((a, b) => new Date(b.clockInAt) - new Date(a.clockInAt));
    const seen = new Set();
    const result = [];
    for (const s of list) {
      if (!seen.has(s.userId)) {
        seen.add(s.userId);
        result.push(s);
      }
    }
    return result;
  }, [clockedData]);
  // Count distinct users from the unique list
  const clockedInCount = useMemo(() => uniqueClockedIn.length, [uniqueClockedIn]);
  const dailyCounts = useMemo(() => statsData?.dashboardStats?.dailyClockInCounts || [], [statsData]);

  // Time range selector component
  const TimeRangeSelector = ({ value, onChange, customDate, onCustomDateChange, options }) => {
    const opts = options || [
      { value: 'today', label: 'Today' },
      { value: 'weekly', label: 'Week' },
      { value: 'monthly', label: 'Month' },
      { value: 'yearly', label: 'Year' },
      { value: 'custom', label: 'Custom' },
    ];
    return (
      <div className="flex items-center gap-2">
        <Select
          value={value}
          onChange={onChange}
          size="small"
          style={{ width: 120 }}
          options={opts}
        />
        {value === 'custom' && (
          <DatePicker
            value={customDate}
            onChange={onCustomDateChange}
            placeholder="Start date"
            size="small"
            disabledDate={(current) => !!current && current.toDate() > new Date()}
          />
        )}
      </div>
    );
  };

  // Cumulative Working Chart Data based on selected time range
  const cumulativeChartData = useMemo(() => {
    // Filter series based on selected date range
    const allCounts = statsData?.dashboardStats?.dailyClockInCounts || [];
    const allHours = statsData?.dashboardStats?.dailyTotalHours || [];
    
    // Improved date comparison for filtering
    const filteredCounts = allCounts.filter(item => {
      const itemDate = new Date(item.date);
      // Set time to noon to avoid timezone issues
      itemDate.setHours(12, 0, 0, 0);
      return itemDate >= mainDateRange.start && itemDate <= mainDateRange.end;
    });
    
    const filteredHours = allHours.filter(item => {
      const itemDate = new Date(item.date);
      // Set time to noon to avoid timezone issues
      itemDate.setHours(12, 0, 0, 0);
      return itemDate >= mainDateRange.start && itemDate <= mainDateRange.end;
    });

    // Sort by date to ensure proper cumulative calculation
    const rows = (metric === 'entries' ? filteredCounts : filteredHours)
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let cum = 0;
    const labels = rows.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = rows.map(r => {
      if (metric === 'entries') {
        cum += (r.count || 0);
      } else {
        cum += (r.hours || 0);
      }
      return cum;
    });

    return {
      labels,
      datasets: [{
        label: metric === 'entries' ? 'Cumulative Entries' : 'Cumulative Hours',
        data: values,
        borderColor: theme.primary,
        backgroundColor: 'rgba(67, 97, 238, 0.15)',
        fill: true,
        tension: 0.35,
      }]
    };
  }, [statsData, mainDateRange, metric]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        usePointStyle: true,
        callbacks: { 
          label: (context) => {
            const v = Number(context.parsed.y ?? 0);
            return metric === 'entries' ? `${v} entries` : `${v.toFixed(2)} hours`;
          }
        }
      }
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { color: theme.textSecondary }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { 
          color: theme.textSecondary,
          precision: 0 
        },
        beginAtZero: true
      }
    }
  }), [metric]);

  

  // Form submit handler (create/update location)
  const onFinish = (values) => {
    const vars = {
      id: editLocId || undefined,
      name: values.name,
      latitude: typeof values.latitude === 'number' ? values.latitude : Number(values.latitude),
      longitude: typeof values.longitude === 'number' ? values.longitude : Number(values.longitude),
      radiusKm: typeof values.radiusKm === 'number' ? values.radiusKm : Number(values.radiusKm),
      // New locations are not active by default; editing preserves current active state if editing an active one
      active: editLocId ? !!locData?.locations?.find(l => l.id === editLocId)?.active : false,
    };
    upsertLocation({ variables: vars });
  };

  // Keep form fields in sync once activeLoc loads
  useEffect(() => {
    if (editLocId) {
      const toEdit = locData?.locations?.find(l => l.id === editLocId);
      if (toEdit) {
        form.setFieldsValue({
          name: toEdit.name,
          radiusKm: toEdit.radiusKm,
          latitude: toEdit.latitude,
          longitude: toEdit.longitude,
        });
      }
    } else {
      form.resetFields();
    }
  }, [editLocId, locData, form]);

  // Locate current browser position and fill form
  const handleLocateCurrent = () => {
    if (!('geolocation' in navigator)) {
      message.error('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        form.setFieldsValue({ latitude: lat, longitude: lng });
        message.success('Current location captured');
        setLocating(false);
      },
      (err) => {
        message.error(err?.message || 'Failed to get current location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Table columns
  const columnsClocked = [
    { 
      title: 'Employee', 
      dataIndex: 'user', 
      key: 'user',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar size="small" className="bg-blue-100 text-blue-600">
            {record.user?.name?.[0]?.toUpperCase() || record.userId?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <span className="font-medium">{record.user?.name || record.user?.email?.split('@')[0] || 'Unknown User'}</span>
        </div>
      )
    },
    { 
      title: 'Status', 
      key: 'status',
      render: () => (
        <Tag icon={<CheckCircleOutlined />} color="success" className="m-0">
          Active
        </Tag>
      )
    },
    { 
      title: 'Time In', 
      dataIndex: 'clockInAt', 
      key: 'clockInAt',
      render: (text) => (
        <div className="text-sm">
          <div className="font-medium">{new Date(text).toLocaleDateString()}</div>
          <div className="text-gray-500 text-xs">{new Date(text).toLocaleTimeString()}</div>
        </div>
      )
    },
    { 
      title: 'Location', 
      key: 'location',
      render: (_, record) => (
        <Tooltip title={`${record.clockInLat}, ${record.clockInLng}`}>
          <div className="flex items-center gap-1 text-gray-600">
            <EnvironmentOutlined className="text-blue-500" />
            <span className="text-sm">On-site</span>
          </div>
        </Tooltip>
      )
    },
  ];

  const columnsUsers = [
    { 
      title: 'Employee', 
      dataIndex: 'name', 
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <Avatar size="large" className="bg-blue-100 text-blue-600">
            {text?.[0]?.toUpperCase() || record.email?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <div className="font-medium">{text || record.email?.split('@')[0] || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      )
    },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => (
        <Tag color={role === 'ADMIN' ? 'gold' : 'blue'} className="capitalize m-0">
          {role?.toLowerCase()}
        </Tag>
      )
    },
    { 
      title: 'Status', 
      key: 'status',
      render: (_, record) => {
        // Fix: Check if user is currently clocked in
        const isClockedIn = clockedData?.currentlyClockedIn?.some(c => c.userId === record.id);
        return (
          <Tag color={isClockedIn ? 'green' : 'default'} className="m-0">
            {isClockedIn ? 'Active' : 'Inactive'}
          </Tag>
        );
      }
    },
    { 
      title: 'Actions', 
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Analytics">
            <Link href={`/admin/users/${record.id}`}>
              <Button type="primary" size="small">View Analytics</Button>
            </Link>
          </Tooltip>
          <Tooltip title={record.role === 'ADMIN' ? 'Make Worker' : 'Make Admin'}>
            <Button 
              type="text"
              size="small"
              icon={<UserSwitchOutlined className="text-gray-500 hover:text-blue-500" />} 
              onClick={() => promoteUser({ 
                variables: { 
                  id: record.id, 
                  role: record.role === 'ADMIN' ? 'CAREWORKER' : 'ADMIN' 
                } 
              })} 
            />
          </Tooltip>
          <Tooltip title="Remove User">
            <Button 
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />} 
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove ${record.name || 'this user'}?`)) {
                  deleteUser({ variables: { id: record.id } });
                }
              }} 
            />
          </Tooltip>
        </Space>
      )
    },
  ];

  // Loading state
  if (loadingUsers || loadingStats || loadingClockedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-200 via-blue-100 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 via-blue-100 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Active Now"
            value={clockedInCount}
            icon={<TeamOutlined />}
            color="blue"
            trend={12}
            trendText="from yesterday"
            loading={loadingClockedIn}
          />
          <StatCard 
            title="Total Workers"
            value={workersCount}
            icon={<UserAddOutlined />}
            color="green"
            trend={5}
            trendText="this month"
            loading={loadingUsers}
          />
          <StatCard 
            title="Admin Users"
            value={adminsCount}
            icon={<UserSwitchOutlined />}
            color="yellow"
            loading={loadingUsers}
          />
          <StatCard 
            title="Total Users"
            value={totalUsers}
            icon={<UserAddOutlined />}
            color="purple"
            loading={loadingUsers}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Cumulative Working Chart */}
          <div className="lg:col-span-2">
            <StyledCard 
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <BarChartOutlined className="text-blue-500" />
                    <span>Cumulative Working</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                      <button
                        onClick={() => setMetric('entries')}
                        className={`px-2 py-1 text-xs rounded ${metric === 'entries' ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
                      >Entries</button>
                      <button
                        onClick={() => setMetric('hours')}
                        className={`px-2 py-1 text-xs rounded ${metric === 'hours' ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
                      >Hours</button>
                    </div>
                    <TimeRangeSelector 
                      value={timeRange}
                      onChange={setTimeRange}
                      customDate={customStartDate}
                      onCustomDateChange={setCustomStartDate}
                    />
                  </div>
                </div>
              }
            >
              <div className="h-64">
                {cumulativeChartData?.labels?.length ? (
                  <Line data={cumulativeChartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No data in the selected range
                  </div>
                )}
              </div>
            </StyledCard>
          </div>

          {/* Currently Working */}
          <div>
            <StyledCard 
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <ClockCircleOutlined className="text-green-500" />
                    <span>Currently Working</span>
                  </div>
                  <Badge count={clockedInCount} color="green" />
                </div>
              }
            >
              <div className="space-y-4">
                {clockedInCount === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No one is currently working</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop / Tablet Table */}
                    <div className="hidden md:block">
                      <Table 
                        size="small"
                        rowKey="userId"
                        dataSource={uniqueClockedIn}
                        columns={columnsClocked}
                        pagination={false}
                        loading={loadingClockedIn}
                        className="border-0"
                        sticky
                        scroll={{ y: 300, x: true }}
                      />
                    </div>

                    {/* Mobile Card List */}
                    <div className="md:hidden">
                      <div className="max-h-72 overflow-y-auto pr-1 divide-y divide-gray-100">
                        {uniqueClockedIn.map((record) => (
                          <div key={record.userId} className="py-2 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar size="small" className="bg-blue-100 text-blue-600 shrink-0">
                                {record.user?.name?.[0]?.toUpperCase() || record.userId?.[0]?.toUpperCase() || 'U'}
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate max-w-[160px]">
                                  {record.user?.name || record.user?.email?.split('@')[0] || 'Unknown User'}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {new Date(record.clockInAt).toLocaleTimeString()} • {new Date(record.clockInAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag icon={<CheckCircleOutlined />} color="success" className="m-0">Active</Tag>
                              <Tooltip title={`${record.clockInLat}, ${record.clockInLng}`}>
                                <EnvironmentOutlined className="text-blue-500" />
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="text-right">
                  <Button type="link" size="small" className="text-xs">
                    View All Activity
                  </Button>
                </div>
              </div>
            </StyledCard>
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-8">
          <StyledCard
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <TeamOutlined className="text-blue-500" />
                  <span>Team Members</span>
                </div>
                <div>
                  <Input.Search 
                    placeholder="Search team members..." 
                    className="w-64"
                    size="middle"
                    onSearch={(val) => debouncedSearch(val)}
                    onChange={(e) => debouncedSearch(e.target.value)}
                  />
                </div>
              </div>
            }
          >
            <Table
              rowKey="id"
              dataSource={usersData?.users || []}
              columns={columnsUsers}
              loading={loadingUsers}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} members`
              }}
              className="border-0"
              
            />
          </StyledCard>
        </div>

      

      {/* Location Settings */}
      <div className="mb-8">
        <StyledCard
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <EnvironmentOutlined className="text-blue-500" />
                  <span>Location Settings</span>
                </div>
                <Button 
                  size="middle" 
                  icon={<AimOutlined />} 
                  onClick={handleLocateCurrent}
                  loading={locating}
                >
                  Use current location
                </Button>
              </div>
            }
          >
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish} 
              initialValues={{ radiusKm: 0.25 }}
              className="max-w-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item 
                  label="Location Name" 
                  name="name"
                  rules={[{ required: true, message: 'Please enter a location name' }]}
                >
                  <Input placeholder="e.g. Main Hospital" size="large" />
                </Form.Item>
                
                <Form.Item 
                  label="Radius (km)" 
                  name="radiusKm"
                  rules={[{ 
                    required: true, 
                    message: 'Please enter a radius',
                    type: 'number',
                    min: 0.05,
                  }]}
                >
                  <InputNumber 
                    min={0.05} 
                    step={0.05} 
                    className="w-full"
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item 
                  label="Latitude" 
                  name="latitude"
                  rules={[{ 
                    required: true, 
                    message: 'Please enter a valid latitude',
                    type: 'number',
                    min: -90,
                    max: 90
                  }]}
                >
                  <InputNumber 
                    className="w-full"
                    size="large"
                    step="0.000001"
                    precision={6}
                  />
                </Form.Item>
                
                <Form.Item 
                  label="Longitude" 
                  name="longitude"
                  rules={[{ 
                    required: true, 
                    message: 'Please enter a valid longitude',
                    type: 'number',
                    min: -180,
                    max: 180
                  }]}
                >
                  <InputNumber 
                    className="w-full"
                    size="large"
                    step="0.000001"
                    precision={6}
                  />
                </Form.Item>
              </div>
              
              <div className="flex items-center gap-4 mt-6">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large"
                  loading={savingLoc}
                  className="min-w-[180px]"
                >
                  {editLocId ? 'Update Location' : 'Save Location'}
                </Button>
                
                {editLocId && (
                  <Button 
                    size="large"
                    onClick={() => { setEditLocId(null); form.resetFields(); }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </Form>

            {/* Locations List */}
            <div className="mt-8">
              <h3 className="text-base font-medium text-gray-800 mb-3">Saved Locations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Radius (km)</th>
                      <th className="py-2 pr-4">Latitude</th>
                      <th className="py-2 pr-4">Longitude</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(locData?.locations || []).map((loc) => (
                      <tr key={loc.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-800">{loc.name}</td>
                        <td className="py-2 pr-4">{loc.radiusKm}</td>
                        <td className="py-2 pr-4">{loc.latitude}</td>
                        <td className="py-2 pr-4">{loc.longitude}</td>
                        <td className="py-2 pr-4">
                          {loc.active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Active</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">Inactive</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center justify-end gap-2">
                            {!loc.active && (
                              <button
                                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                disabled={settingActive}
                                onClick={() => setActiveLocation({ variables: { id: loc.id } })}
                                title="Set Active"
                              >
                                Set Active
                              </button>
                            )}
                            <button
                              className="px-3 py-1.5 text-xs rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                              onClick={() => setEditLocId(loc.id)}
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                              disabled={deletingLoc}
                              onClick={() => {
                                if (window.confirm(`Delete location "${loc.name}"?`)) {
                                  deleteLocation({ variables: { id: loc.id } });
                                }
                              }}
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!locData?.locations || locData.locations.length === 0) && (
                      <tr>
                        <td className="py-4 text-center text-gray-500" colSpan={6}>No locations saved yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </StyledCard>
        </div>
      </div>
    </div>
  );
}
