import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Add more detailed logging for debugging
const debug = (...args) => {
  console.log('[Auth Middleware]', ...args);
};

// List of admin paths that require ADMIN role
const adminPaths = ['/admin'];

// List of worker paths that require at least CAREWORKER role
const workerPaths = ['/worker'];

// List of public paths that don't require authentication
const publicPaths = ['/', '/api/auth', '/auth-error', '/login', '/post-login', '/_next', '/favicon.ico', '/public', '/auth-debug', '/bypass-login', '/api/bypass-auth', '/direct-admin'];

/**
 * Middleware function to handle authentication and authorization
 */
export default async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  debug('Processing request for path:', pathname);
  
  // Add CORS headers for API routes
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    
    // Set CORS headers
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return response;
    }
    
    return response;
  }
  
  // Skip middleware for public paths and static assets
  if (publicPaths.some(path => pathname.startsWith(path))) {
    debug('Skipping middleware for public path');
    return NextResponse.next();
  }

  // Check if the path is protected
  const isProtectedPath = [...adminPaths, ...workerPaths].some(path => 
    pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    debug('Path is not protected, proceeding');
    return NextResponse.next();
  }

  debug('Path is protected, checking authentication');
  
  try {
    // Get the NextAuth token
    debug('Getting NextAuth token');
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    debug('NextAuth token result:', token ? 'User found' : 'No user');
    
    // If no token, redirect to login with returnTo
    if (!token) {
      debug('No token found, redirecting to login');
      const loginUrl = new URL('/api/auth/signin', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get the user from the database to check their role
    let dbUser = null;
    try {
      debug('Fetching user from database with email:', token.email);
      
      // Validate token data
      if (!token.email) {
        debug('ERROR: Token missing email');
        throw new Error('Token missing required email');
      }
      
      dbUser = await prisma.user.findUnique({
        where: { email: token.email }
      });
      debug('Database user lookup result:', dbUser ? `Found user ${dbUser.id}` : 'User not found');
      
      // If user not found in database, create them
      if (!dbUser) {
        debug('User not found in database, creating new user');
        try {
          // Determine role from token or default to CAREWORKER
          const role = token.role || 'CAREWORKER';
          
          debug('Creating user with role:', role);
          dbUser = await prisma.user.create({
            data: {
              email: token.email,
              name: token.name || token.email.split('@')[0],
              role: role
            }
          });
          debug('User created successfully:', dbUser.id);
        } catch (createError) {
          debug('Failed to create user:', createError.message, createError.code);
          console.error('Failed to create user:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      }
    } catch (dbError) {
      debug('Database error in middleware:', dbError.message);
      console.error('Database error in middleware:', dbError);
      
      // Redirect to error page with detailed error message
      const errorUrl = new URL('/auth-error', req.url);
      errorUrl.searchParams.set('error', 'database_error');
      errorUrl.searchParams.set('message', encodeURIComponent(dbError.message));
      return NextResponse.redirect(errorUrl);
    }

    // Use database role if available, otherwise fallback to token role
    const userRole = dbUser?.role || token.role || 'CAREWORKER';
    
    debug('User role determined:', userRole);

    // Check if user is trying to access admin routes without admin role
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    if (isAdminPath && userRole !== 'ADMIN') {
      debug('Unauthorized admin access attempt, redirecting to worker dashboard');
      // Redirect unauthorized admin access to worker dashboard
      return NextResponse.redirect(new URL('/worker', req.url));
    }

    debug('Authentication successful, allowing request to proceed');
    // Allow the request to proceed
    return NextResponse.next();
  } catch (error) {
    debug('Middleware error:', error.message);
    console.error('Middleware error:', error);
    
    // Add error details to the redirect URL
    const errorUrl = new URL('/auth-error', req.url);
    errorUrl.searchParams.set('error', 'middleware_error');
    errorUrl.searchParams.set('message', encodeURIComponent(error.message));
    
    // Redirect to error page on error
    return NextResponse.redirect(errorUrl);
  }
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api/auth (NextAuth routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
