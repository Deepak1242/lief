import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

/**
 * This is a temporary bypass route for testing purposes only.
 * It allows direct login without going through the NextAuth flow.
 */
export async function POST(request) {
  try {
    const { email, role } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Create a new user with the provided email
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          role: role || 'CAREWORKER',
        },
      });
    }
    
    // Create a JWT token similar to what NextAuth would create
    const token = await encode({
      token: {
        email: user.email,
        name: user.name,
        sub: user.id,
        role: user.role,
      },
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    // Set the token in a cookie
    cookies().set('next-auth.session-token', token, {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Bypass auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}