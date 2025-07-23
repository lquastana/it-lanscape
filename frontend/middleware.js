import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/login.html') {
    return NextResponse.next();
  }
  const user = req.cookies.get('user');
  if (!user) {
    return NextResponse.redirect(new URL('/login.html', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|login\.html).*)'],
};
