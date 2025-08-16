'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useQuery } from '@apollo/client';
import { ME } from '@/graphql/operations';

// Create the context
const AuthContext = createContext();

/**
 * AuthProvider component that wraps the application and provides authentication state
 */
export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const [dbUser, setDbUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  
  const sessionLoading = status === 'loading';
  const sessionUser = session?.user;
  
  // Fetch the user from the database
  const { data, loading: dbLoading, error: dbError, refetch } = useQuery(ME, {
    skip: !sessionUser, // Skip the query if there's no session user
    fetchPolicy: 'cache-first', // Use cache to reduce server requests
    onCompleted: (data) => {
      console.log('ME query completed:', data);
    },
    onError: (error) => {
      console.error('ME query error:', error);
    }
  });

  // Update the state when the data changes
  useEffect(() => {
    console.log('AuthContext: Processing ME query data:', data);
    if (data?.me) {
      console.log('AuthContext: User found in ME query:', data.me);
      console.log('AuthContext: Setting admin role:', data.me.role === 'ADMIN');
      setDbUser(data.me);
      setIsAdmin(data.me.role === 'ADMIN');
      setIsWorker(data.me.role === 'CAREWORKER');
    } else {
      console.log('AuthContext: No user data in ME query, clearing state');
      setDbUser(null);
      setIsAdmin(false);
      setIsWorker(false);
    }
  }, [data]);

  // Fetch database user when session changes
  useEffect(() => {
    if (sessionUser) {
      console.log('AuthContext: Session user changed:', sessionUser);
      console.log('AuthContext: Session user role:', sessionUser.role);
      refetch()
        .then(result => {
          console.log('AuthContext: Database user refetch result:', result);
          if (result.error) {
            console.error('AuthContext: Error fetching database user:', result.error);
          }
        })
        .catch(error => {
          console.error('AuthContext: Failed to refetch database user:', error);
        });
    } else {
      console.log('AuthContext: No session user, clearing state');
    }
  }, [sessionUser, refetch]);

  // Combine loading states
  const isLoading = sessionLoading || (sessionUser && dbLoading);
  
  // The value that will be provided to consumers of this context
  const value = {
    // Session state
    session,
    sessionLoading,
    sessionUser,
    user: sessionUser, // Alias for backward compatibility
    
    // Database user state
    dbUser,
    dbLoading,
    dbError,
    
    // Combined state
    isLoading,
    error: dbError,
    
    // Role-based flags
    isAdmin,
    isWorker,
    
    // Auth methods
    signIn,
    signOut,
    
    // Helper methods
    refetchUser: refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}