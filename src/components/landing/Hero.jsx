"use client";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-blue-50">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-blue-300/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> PWA Enabled • Works offline
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Modern Attendance for Healthcare Teams
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Geofenced clock in/out, real‑time visibility, and analytics. Built for hospitals and care organizations.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/api/auth/login?returnTo=/post-login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-white shadow-sm transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
          <div className="mt-4 text-xs text-gray-500">No installs required. Add to Home Screen.</div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-blue-200/40 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="aspect-[16/10] w-full bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
          </div>
        </div>
      </div>
    </section>
  );
}
