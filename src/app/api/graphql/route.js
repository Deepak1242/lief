import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { resolvers } from '@/graphql/resolvers';
// Import the type definitions with the correct path
import { typeDefs } from '@/graphql/typeDefs';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';
import { syncAuth0User } from '@/lib/auth0/userSync';

console.log('Initializing Apollo Server with typeDefs and resolvers');

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Enable introspection in development
  introspection: process.env.NODE_ENV !== 'production',
});

// Create the handler with proper context
const handler = async (req, res) => {
  try {
    console.log('--- New GraphQL Request ---');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    // Get the Auth0 session
    console.log('Fetching Auth0 session...');
    const session = await getSession(req, res);
    console.log('Auth0 session:', session ? 'Found' : 'Not found');
    
    let dbUser = null;

    // Sync Auth0 user with our database
    if (session?.user) {
      console.log('Auth0 user found, syncing with database...');
      console.log('Auth0 user data:', {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name
      });
      
      try {
        dbUser = await syncAuth0User(session.user);
        console.log('Database user after sync:', dbUser);
      } catch (error) {
        console.error('Error syncing user:', {
          message: error.message,
          stack: error.stack,
          user: session.user
        });
      }
    } else {
      console.log('No Auth0 user found in session');
    }

    const context = {
      // Pass the request and response objects
      req,
      res,
      // Include the Auth0 session
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
      // Use the startServerAndCreateNextHandler with our context
      const graphqlHandler = startServerAndCreateNextHandler(server, {
        context: async () => context,
      });
      
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
