"use client";
import Link from "next/link";
import { FaClock, FaMobileAlt, FaShieldAlt, FaChartLine } from 'react-icons/fa';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl animate-float-delay" />
        <div className="absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl animate-float-slow" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-2 lg:gap-16">
        <div className="space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 backdrop-blur-sm">
            <FaClock className="h-4 w-4 text-blue-600" />
            <span>PWA Enabled • Works Offline</span>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Modern Attendance</span>
            <span className="block bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              for Healthcare Teams
            </span>
          </h1>
          
          <p className="text-lg leading-8 text-gray-600 sm:text-xl">
            Streamline your workforce management with geofenced clock in/out, real‑time visibility, and powerful analytics. 
            Designed specifically for hospitals and healthcare organizations.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/api/auth/login?returnTo=/post-login"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl hover:ring-2 hover:ring-blue-400 hover:ring-offset-2"
            >
              <span>Get Started Free</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FaMobileAlt className="h-4 w-4" />
              <span>No installs required • Add to Home Screen</span>
            </div>
          </div>
          
          <div className="pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200" />
              ))}
              <div className="flex h-10 items-center justify-center rounded-full border-2 border-white bg-blue-50 px-3 text-sm font-medium text-blue-600">
                1000+ Teams
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Trusted by healthcare professionals worldwide</p>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute -inset-8 rounded-4xl bg-gradient-to-br from-blue-100/50 to-blue-200/30 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white/80 p-1 shadow-2xl backdrop-blur-sm">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: <FaClock className="h-6 w-6 text-blue-600" />, label: 'Clock In/Out' },
                    { icon: <FaMobileAlt className="h-6 w-6 text-emerald-600" />, label: 'Mobile Ready' },
                    { icon: <FaShieldAlt className="h-6 w-6 text-amber-500" />, label: 'Secure' },
                    { icon: <FaChartLine className="h-6 w-6 text-purple-600" />, label: 'Analytics' },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center space-y-2 rounded-xl bg-white/80 p-4 backdrop-blur-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
