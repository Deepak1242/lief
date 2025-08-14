"use client";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="bg-blue-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:px-6 sm:flex-row">
        <h3 className="m-0 text-center text-2xl font-semibold text-white sm:text-left">
          Ready to modernize attendance?
        </h3>
        <div className="flex gap-3">
          <Link
            href="/api/auth/login?screen_hint=signup&returnTo=/post-login"
            className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            Create account
          </Link>
          <Link
            href="/api/auth/login?returnTo=/post-login"
            className="inline-flex items-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}
