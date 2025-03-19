import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function middleware(request: NextRequest) {
  // Only check usage limits for chat API requests
  if (request.nextUrl.pathname.startsWith('/api/chat') && request.method === 'POST') {
    const session = await auth();
    
    // If not authenticated, return 401
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has reached their daily limit
    // We'll implement this in the API route itself since we need database access
    // This middleware just ensures the user is authenticated
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/chat',
  ],
};
