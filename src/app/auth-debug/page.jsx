'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, Alert, Typography, Descriptions, Divider, Space } from 'antd';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';

const { Title, Text } = Typography;

export default function AuthDebugPage() {
  const { sessionUser: user, dbUser, isLoading, error, isAdmin, isWorker } = useAuth();
  const [logs, setLogs] = useState([]);

  // Add a log entry with timestamp
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Log authentication state changes
  useEffect(() => {
    addLog('Auth state changed');
    addLog(`Session user: ${user ? 'Present' : 'Not present'}`);
    addLog(`Database user: ${dbUser ? 'Present' : 'Not present'}`);
    addLog(`Loading: ${isLoading}`);
    addLog(`Error: ${error ? error.message : 'None'}`);
    
    if (user) {
      addLog('Session user details:', 'debug');
      addLog(`Email: ${user.email}`);
      addLog(`Name: ${user.name}`);
    }
    
    if (dbUser) {
      addLog('Database user details:', 'debug');
      addLog(`ID: ${dbUser.id}`);
      addLog(`Email: ${dbUser.email}`);
      addLog(`Role: ${dbUser.role}`);
    }
  }, [user, dbUser, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <Title level={3}>Authentication Debug</Title>
          <Alert 
            type="info" 
            message="Loading authentication state..." 
            showIcon 
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-4xl mx-auto shadow-md">
        <Title level={2}>Authentication Debug Page</Title>
        
        <div className="mb-6">
          <Alert 
            type={error ? "error" : user && dbUser ? "success" : "warning"} 
            message={error ? "Authentication Error" : user && dbUser ? "Authentication Successful" : "Not Authenticated"} 
            description={error ? error.message : user && dbUser ? "You are authenticated and your user data is synchronized with the database." : "You are not currently authenticated."}
            showIcon 
          />
        </div>

        {user && (
          <>
            <Title level={4}>Session User Information</Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
            </Descriptions>
          </>
        )}

        {dbUser && (
          <>
            <Divider />
            <Title level={4}>Database User Information</Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Database ID">{dbUser.id}</Descriptions.Item>
              <Descriptions.Item label="Email">{dbUser.email}</Descriptions.Item>
              <Descriptions.Item label="Role">{dbUser.role}</Descriptions.Item>
              <Descriptions.Item label="Is Admin">{isAdmin ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Is Worker">{isWorker ? 'Yes' : 'No'}</Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Divider />
        <Title level={4}>Authentication Logs</Title>
        <div className="bg-gray-100 p-4 rounded max-h-60 overflow-auto">
          {logs.map((log, index) => (
            <div key={index} className={`mb-1 ${log.type === 'error' ? 'text-red-600' : log.type === 'debug' ? 'text-blue-600' : ''}`}>
              <Text code>{log.timestamp}</Text> {log.message}
            </div>
          ))}
        </div>

        <Divider />
        <Space>
          {!user && (
            <Button type="primary" onClick={() => signIn()}>Login</Button>
          )}
          {user && (
            <>
              <Button onClick={() => signOut()}>Logout</Button>
              {isAdmin && (
                <Button type="primary">
                  <Link href="/admin">Go to Admin Dashboard</Link>
                </Button>
              )}
              {isWorker && (
                <Button type="primary">
                  <Link href="/worker">Go to Worker Dashboard</Link>
                </Button>
              )}
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}