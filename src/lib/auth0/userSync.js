import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Syncs an Auth0 user with the local database
 * @param {Object} user - The Auth0 user object
 * @param {string} user.sub - Auth0 user ID
 * @param {string} user.email - User's email
 * @param {string} [user.name] - User's full name
 * @param {string} [user.nickname] - User's nickname
 * @returns {Promise<Object>} The synced user from the database
 */
export async function syncAuth0User(user) {
  console.log('Syncing Auth0 user to database:', { 
    auth0Id: user.sub, 
    email: user.email,
    name: user.name || user.nickname || user.email.split('@')[0]
  });

  try {
    // Default to CAREWORKER role for new users
    const defaultRole = 'CAREWORKER';
    
    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { auth0Id: user.sub }
    });

    console.log('Existing user check result:', existingUser ? 'Found' : 'Not found');

    if (existingUser) {
      console.log('Updating existing user:', existingUser.id);
      // Update existing user if needed
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: user.email,
          name: user.name || user.nickname || user.email.split('@')[0],
          updatedAt: new Date()
        }
      });
      console.log('Updated user:', updatedUser);
      return updatedUser;
    }

    console.log('Creating new user in database');
    // Create new user if they don't exist
    const newUser = await prisma.user.create({
      data: {
        auth0Id: user.sub,
        email: user.email,
        name: user.name || user.nickname || user.email.split('@')[0],
        role: defaultRole
      }
    });
    
    console.log('Created new user:', newUser);
    return newUser;
  } catch (error) {
    console.error('Error syncing Auth0 user to database:', {
      error: error.message,
      stack: error.stack,
      user: {
        auth0Id: user.sub,
        email: user.email
      }
    });
    throw error;
  }
}

/**
 * Middleware to sync the current user with the database
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @param {Function} next - Next middleware function
 */
export async function withUserSync(req, res, next) {
  try {
    const session = req.session;
    if (session?.user) {
      // Sync the user to the database
      const dbUser = await syncAuth0User(session.user);
      
      // Add the database user ID to the session
      req.user = {
        ...session.user,
        dbId: dbUser.id,
        role: dbUser.role
      };
    }
    next();
  } catch (error) {
    console.error('Error in user sync middleware:', error);
    next(error);
  }
}
