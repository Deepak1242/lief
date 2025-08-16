"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";

export default function Home() {
  const router = useRouter();
  const { sessionUser, isAdmin, isWorker, isLoading } = useAuth();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // If user is logged in, redirect to appropriate dashboard
    if (sessionUser) {
      if (isAdmin) {
        router.push('/admin');
      } else if (isWorker) {
        router.push('/worker');
      } else {
        // Default to worker dashboard if role is unclear
        router.push('/worker');
      }
    }
  }, [sessionUser, isAdmin, isWorker, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // If user is logged in, this will be redirected by useEffect
  // Show landing page for non-authenticated users
  return (
    <main>
      <Hero />
      <Features />
      <CTA />
    </main>
  );
}
