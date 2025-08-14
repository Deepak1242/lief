import { handleAuth, handleLogin } from "@auth0/nextjs-auth0";
import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";

// Provide a small wrapper matching our usage in routes and middleware.
// If you need custom authorization params (audience/scope), we can pass
// options into handleAuth later where needed.
export const auth0 = {
  handleAuth,
  handleLogin,
  withMiddlewareAuthRequired,
};
