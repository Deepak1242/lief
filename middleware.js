import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';

// List of admin paths that require ADMIN role
const adminPaths = ['/admin'];

// List of worker paths that require at least USER role
const workerPaths = ['/worker'];

// List of public paths that don't require authentication
const publicPaths = ['/', '/api/auth', '/auth-error'];

export default async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if the path is protected
  const isProtectedPath = [...adminPaths, ...workerPaths].some(path => 
    pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  try {
    // Get the session
    const session = await getSession();
    const user = session?.user;
    
    // If no session, redirect to login with returnTo
    if (!user) {
      const loginUrl = new URL('/api/auth/login', req.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is trying to access admin routes without admin role
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    if (isAdminPath && user.role !== 'ADMIN') {
      // Redirect to unauthorized or home page
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Allow the request to proceed
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Redirect to error page or home on error
    return NextResponse.redirect(new URL('/auth-error?error=middleware_error', req.url));
  }
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api/auth (Auth0 routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
