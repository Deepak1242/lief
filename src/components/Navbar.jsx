"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === "loading";
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
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-105 duration-300">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 group-hover:opacity-40 blur transition-opacity duration-300"></div>
            <img 
              src="/lief-high-resolution-logo-transparent.png" 
              alt="Lief Clock Logo" 
              className="relative h-10 w-auto drop-shadow-lg"
              width={100}
              height={100}
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Lief
            </span>
            <div className="text-xs text-blue-300 font-medium tracking-wider uppercase">
              Time Management
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex" ref={userMenuRef}>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="group flex items-center gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-blue-500/25"
                aria-expanded={userOpen}
                aria-label="User menu"
              >
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-60 group-hover:opacity-80 blur-sm transition-opacity duration-300"></div>
                  <span className="relative inline-grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-xs font-bold text-white shadow-lg">
                    {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="max-w-[120px] truncate font-semibold text-white">
                    {user.name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-blue-200">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <svg 
                  className={`h-4 w-4 text-blue-200 transition-all duration-300 ${userOpen ? 'rotate-180 text-white' : 'group-hover:text-white'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div 
                className={`absolute right-0 mt-3 w-56 origin-top-right overflow-hidden rounded-xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20 transition-all duration-300 ${userOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-2 pointer-events-none'}`}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
              >
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.clear();
                      signOut({ callbackUrl: '/' });
                    }}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-red-50 hover:text-red-700 mt-1"
                    role="menuitem"
                    tabIndex="-1"
                  >
                    <svg className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button 
                onClick={() => signIn(null, { callbackUrl: '/post-login' })} 
                className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/20 hover:border-white/50 hover:shadow-lg hover:shadow-blue-500/25"
              >
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <Link 
                href="/register" 
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
              >
                <span className="relative text-white z-10">Get Started</span>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="group inline-flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 p-2.5 text-white transition-all duration-300 hover:bg-white/20 hover:border-white/50 hover:shadow-lg hover:shadow-blue-500/25 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg 
            className={`h-5 w-5 transition-all duration-300 ${open ? 'rotate-90' : 'group-hover:scale-110'}`} 
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
        className={`border-t border-white/10 bg-gradient-to-b from-slate-900/95 to-blue-900/95 backdrop-blur-xl px-6 py-6 text-white transition-all duration-300 md:hidden ${open ? 'block opacity-100' : 'hidden opacity-0'}`}
        role="dialog"
        aria-modal="true"
      >
        {user ? (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-60 blur-sm"></div>
                <span className="relative inline-grid h-10 w-10 place-items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white shadow-lg">
                  {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white">{user.name || 'User'}</span>
                <span className="text-xs text-blue-200 truncate">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={() => {
                setOpen(false);
                localStorage.clear();
                signOut({ callbackUrl: '/' });
              }}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm font-semibold text-red-300 transition-all duration-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <button 
              onClick={() => {
                setOpen(false);
                signIn(null, { callbackUrl: '/post-login' });
              }} 
              className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/20 hover:border-white/50"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <Link 
              href="/register" 
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/50"
              onClick={() => setOpen(false)}
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
