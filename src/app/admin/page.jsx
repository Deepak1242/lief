"use client";
import AdminDashboard from "@/components/AdminDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Spin, Alert } from "antd";

export default function AdminPage() {
  const { user, dbUser, isLoading, error, isAdmin } = useAuth();
  
  console.log('AdminPage: Auth state:', {
    user: user,
    dbUser: dbUser,
    isLoading: isLoading,
    error: error,
    isAdmin: isAdmin
  });
  
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
          description="There was a problem with your authentication. Please try logging in again."
          showIcon 
          className="max-w-md"
        />
      </div>
    );
  }

  // Check if user is authenticated (need at least dbUser from GraphQL)
  if (!dbUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert 
          type="warning" 
          message="Access Denied" 
          description="Please log in to access this page."
          showIcon 
          className="max-w-md"
        />
      </div>
    );
  }

  // Check if user has admin role
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert 
          type="warning" 
          message="Access Denied" 
          description="You do not have permission to access the admin dashboard."
          showIcon 
          className="max-w-md"
        />
      </div>
    );
  }

  return <AdminDashboard />;
}
