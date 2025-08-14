import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: async (req) => {
    const url = new URL(req.url);
    const returnTo = url.searchParams.get('returnTo') || '/post-login';
    
    return await handleLogin(req, {
      returnTo,
      authorizationParams: {
        connection: 'Username-Password-Authentication', // Force database connection
        prompt: 'login',
        scope: process.env.AUTH0_SCOPE || 'openid profile email',
        ...(process.env.AUTH0_AUDIENCE ? { audience: process.env.AUTH0_AUDIENCE } : {}),
      },
    });
  },
  // The rest of the handlers will use the default behavior
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
