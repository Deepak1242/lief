import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test the database connection
    const users = await prisma.user.findMany();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Database connection successful',
      userCount: users.length,
      sampleUser: users[0] || null,
      env: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? '***' : 'Not set',
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Database connection failed',
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        meta: error.meta,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? '***' : 'Not set',
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export const dynamic = 'force-dynamic';
