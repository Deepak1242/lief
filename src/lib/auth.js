import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from './prisma';

/**
 * Get the current user session on the server side
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Syncs a user with the local database
 * @param {Object} user - The user object from NextAuth
 * @returns {Promise<Object>} - The database user object
 */
export async function syncUser(user) {
  if (!user) {
    console.error('Error: No user provided to syncUser');
    return null;
  }

  console.log('Syncing user to database:', {
    id: user.id,
    email: user.email,
  });

  if (!user.email) {
    console.error('Error: User missing email:', user);
    throw new Error('User missing required email');
  }

  try {
    // Check if user exists in database
    console.log('Checking if user exists in database with email:', user.email);
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    // If user exists, return it
    if (dbUser) {
      console.log('User found in database:', dbUser.id);
      return dbUser;
    }

    // If user doesn't exist, create it
    console.log('User not found in database, creating new user');
    
    // Determine role (default to CAREWORKER)
    const role = user.role || 'CAREWORKER';
    
    // Create user in database
    dbUser = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role,
      },
    });

    console.log('Created new user in database:', dbUser.id);
    return dbUser;
  } catch (error) {
    console.error('Error syncing user to database:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      email: user.email,
    });
    throw error;
  }
}

/**
 * Get the current user from the database
 * @returns {Promise<Object>} - The database user object
 */
export async function getCurrentUser() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      console.log('No session or user found');
      return null;
    }
    
    console.log('Session user:', session.user);
    
    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!dbUser) {
      console.log('User not found in database, attempting to create');
      return await syncUser(session.user);
    }
    
    return dbUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if the current user has a specific role
 * @param {string} role - The role to check
 * @returns {Promise<boolean>} - Whether the user has the role
 */
export async function hasRole(role) {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if the current user is an admin
 * @returns {Promise<boolean>} - Whether the user is an admin
 */
export async function isAdmin() {
  return await hasRole('ADMIN');
}

/**
 * Check if the current user is a care worker
 * @returns {Promise<boolean>} - Whether the user is a care worker
 */
export async function isCareworker() {
  return await hasRole('CAREWORKER');
}