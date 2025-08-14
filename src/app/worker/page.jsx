"use client";
import WorkerDashboard from "@/components/WorkerDashboard";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Alert, Spin } from "antd";

export default function WorkerPage() {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
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
