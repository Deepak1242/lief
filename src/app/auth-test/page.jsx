'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, Alert, Button, Typography } from 'antd';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';

const { Title, Text } = Typography;

export default function AuthTestPage() {
  const { 
    user, 
    dbUser, 
    isLoading, 
    error, 
    isAdmin, 
    isWorker 
  } = useAuth();
  
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    if (!isLoading && user && dbUser) {
      // Run tests when data is available
      const results = {
        authenticationSuccessful: !!user,
        databaseSyncSuccessful: !!dbUser,
        roleDetection: {
          isAdmin: isAdmin,
          isWorker: isWorker,
          dbRole: dbUser?.role
        },
        userDetails: {
          email: user?.email,
          name: user?.name,
          dbId: dbUser?.id
        }
      };
      
      setTestResults(results);
    }
  }, [user, dbUser, isLoading, isAdmin, isWorker]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert 
          type="error" 
          message="Authentication Error" 
          description={`There was a problem with your authentication: ${error.message}`}
          showIcon 
          className="max-w-md"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert 
          type="warning" 
          message="Login Required" 
          description="Please log in to test the authentication system."
          showIcon 
          className="max-w-md"
          action={
            <Button type="primary" onClick={() => signIn()}>
              Login
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-4xl mx-auto shadow-md">
        <Title level={2}>Authentication System Test</Title>
        
        <div className="mb-6">
          <Alert 
            type={testResults ? "success" : "warning"} 
            message={testResults ? "Authentication Successful" : "Testing Authentication..."} 
            description={testResults ? "You are authenticated and your user data is synchronized with the database." : "Checking authentication status and database synchronization."}
            showIcon 
          />
        </div>

        {testResults && (
          <>
            <Title level={4}>User Information</Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Database ID">{testResults.userDetails.dbId}</Descriptions.Item>
              <Descriptions.Item label="Email">{testResults.userDetails.email}</Descriptions.Item>
              <Descriptions.Item label="Name">{testResults.userDetails.name}</Descriptions.Item>
            </Descriptions>

            <Title level={4} className="mt-6">Role Information</Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Database Role">{testResults.roleDetection.dbRole}</Descriptions.Item>
              <Descriptions.Item label="Is Admin">{testResults.roleDetection.isAdmin ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Is Worker">{testResults.roleDetection.isWorker ? 'Yes' : 'No'}</Descriptions.Item>
            </Descriptions>

            <div className="mt-6 flex gap-4">
              <Button type="primary">
                <Link href={isAdmin ? "/admin" : "/worker"}>Go to Dashboard</Link>
              </Button>
              <Button onClick={() => signOut()}>
                Logout
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}