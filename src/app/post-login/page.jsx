'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Alert } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

export default function PostLogin() {
  const { sessionUser: user, dbUser, isLoading, error, isAdmin, isWorker } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If still loading, do nothing
    if (isLoading) return;

    // If there's an error, redirect to error page
    if (error) {
      console.error('Auth error:', error);
      router.replace('/auth-error?error=auth_failed');
      return;
    }

    // If no user but also no error, redirect to login
    if (!user) {
      router.replace('/api/auth/signin');
      return;
    }

    // Wait for database user to be loaded
    if (!dbUser) return;
    
    // Redirect based on role from database
    if (isAdmin) {
      router.replace('/admin');
    } else if (isWorker) {
      router.replace('/worker');
    } else {
      // Fallback to worker dashboard for any other role
      router.replace('/worker');
    }
  }, [user, dbUser, isLoading, error, isAdmin, isWorker, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <Spin size="large" />
      <Alert 
        className="mt-4 w-full max-w-md" 
        message="Signing you in..." 
        type="info" 
        showIcon 
      />
    </div>
  );
}
