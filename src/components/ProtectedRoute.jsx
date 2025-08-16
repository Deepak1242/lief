'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ProtectedRoute component that handles authentication-based routing
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} props.requireAuth - 'authenticated' | 'unauthenticated' | 'admin' | 'worker'
 * @param {string} props.redirectTo - Path to redirect to if access is denied
 */
export default function ProtectedRoute({ 
  children, 
  requireAuth = 'authenticated', 
  redirectTo = '/' 
}) {
  const router = useRouter();
  const { sessionUser, isAdmin, isWorker, isLoading } = useAuth();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    switch (requireAuth) {
      case 'unauthenticated':
        // Redirect authenticated users away from login/register pages
        if (sessionUser) {
          if (isAdmin) {
            router.push('/admin');
          } else if (isWorker) {
            router.push('/worker');
          } else {
            router.push('/worker'); // Default dashboard
          }
        }
        break;

      case 'authenticated':
        // Redirect unauthenticated users to login
        if (!sessionUser) {
          router.push('/login');
        }
        break;

      case 'admin':
        // Redirect non-admin users
        if (!sessionUser) {
          router.push('/login');
        } else if (!isAdmin) {
          router.push('/worker'); // Redirect to worker dashboard
        }
        break;

      case 'worker':
        // Redirect non-worker users
        if (!sessionUser) {
          router.push('/login');
        } else if (isAdmin) {
          router.push('/admin'); // Redirect admin to admin dashboard
        } else if (!isWorker) {
          router.push('/worker'); // Default to worker dashboard
        }
        break;

      default:
        break;
    }
  }, [sessionUser, isAdmin, isWorker, isLoading, router, requireAuth]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check access permissions
  const hasAccess = () => {
    switch (requireAuth) {
      case 'unauthenticated':
        return !sessionUser;
      case 'authenticated':
        return !!sessionUser;
      case 'admin':
        return sessionUser && isAdmin;
      case 'worker':
        return sessionUser && (isWorker || !isAdmin); // Allow non-admin users to access worker dashboard
      default:
        return true;
    }
  };

  // Render children if access is granted
  if (hasAccess()) {
    return children;
  }

  // Show loading while redirect is happening
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
