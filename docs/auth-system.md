# Authentication and Authorization System Documentation

## Overview

This document outlines the authentication and authorization system implemented in the application. The system uses Auth0 for authentication and integrates with a Prisma-managed database for user management and role-based authorization.

## Architecture

### Components

1. **Auth0 Integration**: Handles user authentication, login/logout flows, and session management.
2. **Database Synchronization**: Syncs Auth0 user data with the Prisma database.
3. **Role-Based Authorization**: Controls access to different parts of the application based on user roles.
4. **React Context API**: Manages authentication and authorization state across the application.
5. **Middleware**: Protects routes based on authentication status and user roles.

## Authentication Flow

1. User logs in via Auth0 (`/api/auth/login`).
2. Upon successful authentication, Auth0 redirects to the callback URL.
3. The application creates a session and redirects to `/post-login`.
4. The post-login page checks the user's role and redirects accordingly:
   - Admin users → `/admin`
   - Worker users → `/worker`
5. The middleware ensures that users can only access routes appropriate for their role.

## Database Synchronization

When a user logs in, the system:

1. Retrieves the user's profile from Auth0.
2. Checks if the user exists in the database using their Auth0 ID.
3. If the user doesn't exist, creates a new user record with default role (CAREWORKER).
4. If the user exists, updates their profile information while preserving their existing role.

## Role Management

- New users are assigned the `CAREWORKER` role by default.
- Roles can be changed in the database (e.g., via the `promoteUser` GraphQL mutation).
- Role changes in the database are reflected in the application upon the user's next login.
- The system respects both Auth0 roles and database roles, with database roles taking precedence.

## Authorization Middleware

The middleware (`middleware.js`) protects routes based on authentication status and user roles:

- Public paths are accessible to all users.
- Worker paths require authentication and any role.
- Admin paths require authentication and the `ADMIN` role.

Unauthenticated users are redirected to the login page, while authenticated users without the required role are redirected to an appropriate dashboard.

## React Context API

The `AuthContext` provides authentication and authorization state across the application:

- `auth0User`: The user's Auth0 profile.
- `dbUser`: The user's database profile, including their role.
- `isAdmin`: Boolean indicating if the user has the `ADMIN` role.
- `isWorker`: Boolean indicating if the user has the `CAREWORKER` role.
- `isLoading`: Boolean indicating if authentication data is being loaded.
- `error`: Any authentication error that occurred.

## Usage in Components

```jsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { auth0User, dbUser, isAdmin, isWorker, isLoading, error } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!auth0User) return <LoginRequired />;
  
  return isAdmin ? <AdminContent /> : <WorkerContent />;
}
```

## Testing

You can test the authentication system by visiting `/auth-test`, which displays:

- Authentication status
- User information from both Auth0 and the database
- Role information
- Links to the appropriate dashboard and logout

## Environment Variables

The following environment variables are required for Auth0 configuration:

```
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_CALLBACK_URL=
AUTH0_LOGOUT_URL=
```

## Troubleshooting

- If users are not being redirected correctly, check the middleware and post-login page.
- If user roles are not being recognized, check the database synchronization in `userSync.js`.
- If authentication is failing, check the Auth0 configuration in `.env`.