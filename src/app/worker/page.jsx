"use client";
import WorkerDashboard from "@/components/WorkerDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, Spin } from "antd";

export default function WorkerPage() {
  const { sessionUser: user, dbUser, isLoading, error } = useAuth();
  
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

  if (!user || !dbUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert 
          type="warning" 
          message="Login Required" 
          description="Please log in to access your dashboard."
          showIcon 
          className="max-w-md"
        />
      </div>
    );
  }

  return <WorkerDashboard />;
}
