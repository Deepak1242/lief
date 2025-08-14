"use client";
import { useQuery, useMutation } from "@apollo/client";
import { 
  Button, Card, Col, Divider, Flex, Form, Input, InputNumber, Row, Table, 
  Tag, Typography, message, Badge, Avatar, Statistic, Space, Tooltip, Skeleton 
} from "antd";
import { 
  ClockCircleOutlined, EnvironmentOutlined, TeamOutlined, BarChartOutlined,
  UserAddOutlined, CheckCircleOutlined, UserSwitchOutlined, CalendarOutlined
} from "@ant-design/icons";
import { 
  CURRENTLY_CLOCKED_IN, LIST_LOCATIONS, SET_ACTIVE_LOCATION, 
  UPSERT_LOCATION, USERS, DELETE_USER, PROMOTE_USER, DASHBOARD_STATS 
} from "@/graphql/operations";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { 
  Chart as ChartJS, LineElement, CategoryScale, LinearScale, 
  PointElement, Tooltip, Legend, Filler 
} from "chart.js";

// Register ChartJS components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

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
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendText}
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
  
  // Data fetching
  const { data: locData, loading: loadingLocations, refetch: refetchLocs } = useQuery(LIST_LOCATIONS);
  const { data: clockedData, loading: loadingClockedIn, startPolling, stopPolling } = useQuery(CURRENTLY_CLOCKED_IN, { pollInterval: 0 });
  const { data: usersData, loading: loadingUsers, refetch: refetchUsers } = useQuery(USERS, { 
    variables: { search: "" },
    fetchPolicy: 'cache-and-network'
  });
  const { data: statsData, loading: loadingStats } = useQuery(DASHBOARD_STATS, {
    fetchPolicy: 'cache-and-network'
  });

  // Polling for real-time updates
  useEffect(() => {
    startPolling(5000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Mutations
  const [upsertLocation, { loading: savingLoc }] = useMutation(UPSERT_LOCATION, {
    onCompleted: () => { 
      message.success("Location saved successfully"); 
      refetchLocs(); 
    },
  });
  
  const [setActiveLocation, { loading: settingActive }] = useMutation(SET_ACTIVE_LOCATION, {
    onCompleted: () => { 
      message.success("Active location updated"); 
      refetchLocs(); 
    },
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
  const activeLoc = useMemo(() => locData?.locations?.find(l => l.active) || null, [locData]);
  const careWorkers = useMemo(() => usersData?.users?.filter(u => u.role === 'CAREWORKER') || [], [usersData]);
  const admins = useMemo(() => usersData?.users?.filter(u => u.role === 'ADMIN') || [], [usersData]);
  const clockedInCount = useMemo(() => clockedData?.currentlyClockedIn?.length || 0, [clockedData]);
  const dailyCounts = useMemo(() => statsData?.dashboardStats?.dailyClockInCounts || [], [statsData]);

  // Chart data
  const chartData = useMemo(() => ({
    labels: dailyCounts.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Daily Clock-ins',
      data: dailyCounts.map(d => d.count),
      borderColor: theme.primary,
      backgroundColor: 'rgba(67, 97, 238, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: theme.primary,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }), [dailyCounts]);

  const chartOptions = {
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
        callbacks: { label: (context) => `${context.parsed.y} check-ins` }
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
            {record.user?.name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <span className="font-medium">{record.user?.name || 'Unknown User'}</span>
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
            <div className="font-medium">{text || 'No Name'}</div>
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
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
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
            title="Total Care Workers"
            value={careWorkers.length}
            icon={<UserAddOutlined />}
            color="green"
            trend={5}
            trendText="this month"
            loading={loadingUsers}
          />
          <StatCard 
            title="Active Location"
            value={activeLoc?.name ? '1' : '0'}
            icon={<EnvironmentOutlined />}
            color="purple"
            loading={loadingLocations}
          />
          <StatCard 
            title="Admin Users"
            value={admins.length}
            icon={<UserSwitchOutlined />}
            color="yellow"
            loading={loadingUsers}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="lg:col-span-2">
            <StyledCard 
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <BarChartOutlined className="text-blue-500" />
                    <span>Weekly Activity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag color="blue" className="m-0">This Week</Tag>
                  </div>
                </div>
              }
            >
              <div className="h-64">
                <Line data={chartData} options={chartOptions} />
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
                  <Table 
                    size="small"
                    rowKey="id"
                    dataSource={clockedData?.currentlyClockedIn || []}
                    columns={columnsClocked}
                    pagination={false}
                    loading={loadingClockedIn}
                    className="border-0"
                  />
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
                    // Add search functionality here
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
              <div className="flex items-center gap-2">
                <EnvironmentOutlined className="text-blue-500" />
                <span>Location Settings</span>
              </div>
            }
          >
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish} 
              initialValues={activeLoc || { radiusKm: 0.25 }}
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
                  {activeLoc ? 'Update Location' : 'Save Location'}
                </Button>
                
                {activeLoc && (
                  <Button 
                    loading={settingActive} 
                    size="large"
                    onClick={() => setActiveLocation({ variables: { id: activeLoc.id } })}
                  >
                    Re-activate Current
                  </Button>
                )}
                
                <div className="ml-auto text-sm text-gray-500">
                  {activeLoc ? (
                    <span>Last updated: {new Date(activeLoc.updatedAt).toLocaleString()}</span>
                  ) : (
                    <span>No active location set</span>
                  )}
                </div>
              </div>
            </Form>
          </StyledCard>
        </div>
      </div>
    </div>
  );
}
