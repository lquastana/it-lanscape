import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session'; // Changed import
import authConfig from './data/auth/auth-config.json';

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'it-landscape-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function middleware(req) {
  const res = NextResponse.next(); // Create the response object once
  const session = await getIronSession(req, res, sessionOptions); // Pass req and the created res

  const { pathname } = req.nextUrl;

  // Prevent redirect loops for the login page
  if (pathname.startsWith('/login')) {
    return res; // No need to modify session for login page, just return the response
  }

  // Check if the current path is protected
  const isProtectedPage = authConfig.protectedPages.some(p => pathname.startsWith(p));
  const isProtectedApi = authConfig.protectedApiRoutes.some(p => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) {
    return res; // Not a protected route, just return the response
  }

  const { user } = session;

  // If route is protected and user is not logged in, redirect or deny
  if (!user || !user.isLoggedIn) {
    if (isProtectedApi) {
      // For API routes, return a JSON response
      return new NextResponse(JSON.stringify({ message: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // For page routes, redirect to login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res; // User is logged in and route is protected, continue with the response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-gcs.png|api/auth).*)',
  ],
};