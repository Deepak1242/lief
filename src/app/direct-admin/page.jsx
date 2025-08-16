'use client';

import { useState, useEffect } from 'react';
import { Card, Statistic, DatePicker, Row, Col, Spin, Alert } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DirectAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [dateRange, setDateRange] = useState('week');

  // Mock data for testing
  const mockData = [
    { date: '2023-08-01', totalHours: 45, totalShifts: 6 },
    { date: '2023-08-02', totalHours: 52, totalShifts: 7 },
    { date: '2023-08-03', totalHours: 48, totalShifts: 6 },
    { date: '2023-08-04', totalHours: 56, totalShifts: 8 },
    { date: '2023-08-05', totalHours: 50, totalShifts: 7 },
    { date: '2023-08-06', totalHours: 42, totalShifts: 6 },
    { date: '2023-08-07', totalHours: 38, totalShifts: 5 },
  ];

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    setTimeout(() => {
      setAnalyticsData(mockData);
      setLoading(false);
    }, 1000);
  }, [dateRange]);

  // Calculate totals
  const totalHours = analyticsData.reduce((sum, item) => sum + item.totalHours, 0);
  const totalShifts = analyticsData.reduce((sum, item) => sum + item.totalShifts, 0);
  const averageHoursPerShift = totalShifts > 0 ? (totalHours / totalShifts).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard (Direct Access)</h1>
      
      <div className="mb-6">
        <DatePicker.RangePicker 
          className="mb-4" 
          onChange={(dates) => {
            // Handle date range change
            console.log('Date range changed:', dates);
          }} 
        />
        
        <div className="flex space-x-2 mb-4">
          <button 
            className={`px-4 py-2 rounded ${dateRange === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setDateRange('today')}
          >
            Today
          </button>
          <button 
            className={`px-4 py-2 rounded ${dateRange === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setDateRange('week')}
          >
            This Week
          </button>
          <button 
            className={`px-4 py-2 rounded ${dateRange === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setDateRange('month')}
          >
            This Month
          </button>
        </div>
      </div>
      
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic title="Total Hours" value={totalHours} suffix="hrs" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total Shifts" value={totalShifts} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Avg Hours/Shift" value={averageHoursPerShift} suffix="hrs" />
          </Card>
        </Col>
      </Row>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Hours by Day</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalHours" fill="#8884d8" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Shifts by Day</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalShifts" fill="#82ca9d" name="Shifts" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}