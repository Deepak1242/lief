"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const userMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserOpen(false);
      }
    }
    
    // Close mobile menu on route change
    setOpen(false);
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pathname]);

  // Close user dropdown when menu is open on mobile
  useEffect(() => {
    if (open) {
      setUserOpen(false);
    }
  }, [open]);

  if (isLoading) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="h-9 w-32 animate-pulse rounded bg-gray-200"></div>
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200 md:hidden"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">LC</span>
          <span className="text-lg font-semibold text-gray-900">Lief Clock</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex" ref={userMenuRef}>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                aria-expanded={userOpen}
                aria-label="User menu"
              >
                <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate font-medium">
                  {user.name?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <svg 
                  className={`h-4 w-4 text-gray-500 transition-transform ${userOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div 
                className={`absolute right-0 mt-2 w-48 origin-top-right overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-100 ${userOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
              >
                <div className="py-1">
                  <Link 
                    href="/api/auth/logout" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                    tabIndex="-1"
                  >
                    Sign out
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link 
                href="/api/auth/login?returnTo=/post-login" 
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Log in
              </Link>
              <Link 
                href="/api/auth/login?screen_hint=signup&returnTo=/post-login" 
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div 
        className={`border-t border-gray-200/70 bg-white/95 px-4 py-3 transition-all duration-200 md:hidden ${open ? 'block' : 'hidden'}`}
        role="dialog"
        aria-modal="true"
      >
        {user ? (
          <div className="flex flex-col space-y-2">
            <Link 
              href="/api/auth/logout" 
              className="inline-flex w-full items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              Sign out
            </Link>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <Link 
              href="/api/auth/login?returnTo=/post-login" 
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
            <Link 
              href="/api/auth/login?screen_hint=signup&returnTo=/post-login" 
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setOpen(false)}
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
