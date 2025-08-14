"use client";
import AdminDashboard from "@/components/AdminDashboard";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Spin, Alert } from "antd";

export default function AdminPage() {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // On server, RBAC enforced by GraphQL; here we just show a message
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert 
          type="warning" 
          message="Access Denied" 
          description="Please log in with an admin account to access this page."
          showIcon 
          className="max-w-md"
        />
      </div>
    );
  }

  return <AdminDashboard />;
}
