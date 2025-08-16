"use client";
import WorkerDashboard from "@/components/WorkerDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function WorkerPage() {
  return (
    <ProtectedRoute requireAuth="worker">
      <WorkerDashboard />
    </ProtectedRoute>
  );
}
