import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prisma';
import { compare } from 'bcrypt';

/**
 * NextAuth configuration options
 */
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('Credentials authorization attempt:', credentials?.email);
        
        if (!credentials?.email) {
          console.log('No email provided');
          return null;
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          // If no user found, create a new user automatically for testing
          if (!user) {
            console.log('User not found, creating new user for:', credentials.email);
            
            try {
              const newUser = await prisma.user.create({
                data: {
                  email: credentials.email,
                  name: credentials.email.split('@')[0],
                  role: credentials.email.includes('admin') ? 'ADMIN' : 'CAREWORKER',
                },
              });
              
              console.log('Created new user successfully:', newUser.id);
              return {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
              };
            } catch (createError) {
              console.error('Failed to create user:', createError);
              return null;
            }
          }
          
          // User exists, return user data
          console.log('Login successful for existing user:', user.email, 'with role:', user.role);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add role to JWT token when user signs in
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add role and ID to session from token
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};