import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

// Define public and protected paths
const PUBLIC_PATHS = ['/login', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if it's a public asset or API auth path, skip middleware
  if (PUBLIC_PATHS.includes(path) || path.startsWith('/_next') || path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get the session cookie
  const sessionToken = request.cookies.get('session')?.value;
  const session = sessionToken ? await decrypt(sessionToken) : null;

  // If not logged in and accessing protected page, redirect to /login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    if (path !== '/') {
      loginUrl.searchParams.set('redirect', path);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and accessing /login, redirect to appropriate panel
  if (path === '/' || path === '/login') {
    if (session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/products', request.url));
    } else {
      return NextResponse.redirect(new URL('/seller/dashboard', request.url));
    }
  }

  // Route protection by role
  if (path.startsWith('/admin') && session.role !== 'ADMIN') {
    // Non-admin trying to access admin area -> redirect to seller dashboard
    return NextResponse.redirect(new URL('/seller/dashboard', request.url));
  }

  if (path.startsWith('/seller') && session.role !== 'SELLER') {
    // Admin trying to access seller area -> redirect to admin products
    return NextResponse.redirect(new URL('/admin/products', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
