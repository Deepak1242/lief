import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { resolvers } from '@/graphql/resolvers';
// Import the type definitions with the correct path
import { typeDefs } from '@/graphql/typeDefs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { syncUser } from '@/lib/auth';

console.log('Initializing Apollo Server with typeDefs and resolvers');

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Enable introspection in development
  introspection: process.env.NODE_ENV !== 'production',
});

// Create the handler with proper context - do this ONCE outside of the request handler
const graphqlHandler = startServerAndCreateNextHandler(server, {
  context: async ({ req, res }) => {
    // Context will be built for each request
    let session = null;
    let dbUser = null;
    try {
      session = await getServerSession(authOptions);
      if (session?.user?.email) {
        dbUser = await syncUser(session.user);
      }
    } catch (error) {
      console.error('Error setting up GraphQL context:', error);
    }
    
    return {
      req,
      res,
      session,
      user: dbUser,
      prisma,
    };
  },
});

// Request handler
const handler = async (req, res) => {
  try {
    console.log('--- New GraphQL Request ---');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    // Get the NextAuth session
    console.log('Fetching NextAuth session...');
    const session = await getServerSession(authOptions);
    console.log('NextAuth session:', session ? 'Found' : 'Not found');
    
    let dbUser = null;

    // Sync user with our database
    if (session?.user) {
      console.log('User found in session, syncing with database...');
      console.log('User data:', {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role
      });
      
      // Validate required user fields
      if (!session.user.email) {
        console.error('User missing required email');
        return new Response(JSON.stringify({
          errors: [{ message: 'User missing required email' }]
        }), { status: 400 });
      }
      
      if (!session.user.email) {
        console.error('User missing required email');
        return new Response(JSON.stringify({
          errors: [{ message: 'User missing required email' }]
        }), { status: 400 });
      }
      
      try {
        console.log('Syncing user to database...');
        try {
          dbUser = await syncUser(session.user);
          console.log('Database user after sync:', dbUser ? `ID: ${dbUser.id}, Role: ${dbUser.role}` : 'No user returned');
          
          if (!dbUser) {
            console.error('User sync completed but no user was returned');
            return new Response(JSON.stringify({
              errors: [{ message: 'Failed to sync user with database - no user returned' }]
            }), { status: 500 });
          }
        } catch (syncError) {
          console.error('Error syncing user with database:', {
            message: syncError.message,
            code: syncError.code,
            meta: syncError.meta
          });
          
          return new Response(JSON.stringify({
            errors: [{ message: `Database sync error: ${syncError.message}` }]
          }), { status: 500 });
        }
      } catch (error) {
        console.error('Error syncing user:', {
          message: error.message,
          stack: error.stack,
          user: session.user
        });
      }
    } else {
      console.log('No user found in session');
    }

    const context = {
      // Pass the request and response objects
      req,
      res,
      // Include the session
      session,
      // Include the database user if available
      user: dbUser,
      // Include the Prisma client
      prisma,
    };

    console.log('GraphQL context created:', {
      hasSession: !!session,
      hasDbUser: !!dbUser,
      userRole: dbUser?.role
    });

    try {
      // Use the pre-created graphqlHandler
      const response = await graphqlHandler(req, res);
      console.log('GraphQL response status:', response.status);
      return response;
      
    } catch (graphQLError) {
      console.error('GraphQL execution error:', {
        message: graphQLError.message,
        stack: graphQLError.stack,
        originalError: graphQLError.originalError?.message,
        locations: graphQLError.locations,
        path: graphQLError.path,
        extensions: graphQLError.extensions,
      });
      
      return new Response(JSON.stringify({
        errors: [{
          message: 'GraphQL execution error',
          extensions: {
            code: 'GRAPHQL_EXECUTION_ERROR',
            exception: process.env.NODE_ENV !== 'production' ? {
              message: graphQLError.message,
              stack: graphQLError.stack,
              originalError: graphQLError.originalError?.message,
            } : undefined
          }
        }]
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
  } catch (error) {
    console.error('Error in GraphQL handler:', {
      message: error.message,
      stack: error.stack,
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers
      }
    });
    
    // Return a proper error response
    return new Response(JSON.stringify({
      errors: [{
        message: 'Internal server error',
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          exception: {
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            name: error.name
          }
        }
      }]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Export the handler for both GET and POST requests
export const GET = handler;
export const POST = handler;

// Ensure dynamic rendering and Node.js runtime
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
