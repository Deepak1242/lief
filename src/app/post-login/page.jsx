'use client';

import { useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { Spin, Alert } from 'antd';

export default function PostLogin() {
  const { user, error, isLoading } = useUser();
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
      router.replace('/api/auth/login');
      return;
    }

    // Get user roles from Auth0 token
    const roles = user['https://liefclock.com/roles'] || [];
    
    // Redirect based on role
    if (roles.includes('ADMIN')) {
      router.replace('/admin');
    } else {
      // Default to worker dashboard for all other roles
      router.replace('/worker');
    }
  }, [user, error, isLoading, router]);

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
