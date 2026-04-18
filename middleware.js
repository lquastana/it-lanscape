import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import authConfig from './data/auth/auth-config.json';

const ROLE_ORDER = ['viewer', 'editor', 'admin'];

function hasRequiredRole(userRole, requiredRole) {
  const userIndex = ROLE_ORDER.indexOf(userRole || '');
  const requiredIndex = ROLE_ORDER.indexOf(requiredRole);
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex >= requiredIndex;
}

function requiredRoleForPath(pathname) {
  if (pathname.startsWith('/admin-habilitations')) return 'admin';
  if (pathname.startsWith('/admin')) return 'editor';
  if (
    pathname.startsWith('/applications') ||
    pathname.startsWith('/flux') ||
    pathname.startsWith('/network') ||
    pathname.startsWith('/incident')
  ) return 'viewer';
  return null;
}

export async function middleware(req) {
  if (process.env.AUTH_ENABLED === 'false') return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/login')) return NextResponse.next();

  const isProtectedPage = authConfig.protectedPages.some(p => pathname.startsWith(p));
  const isProtectedApi = authConfig.protectedApiRoutes.some(p => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isProtectedApi) {
      return new NextResponse(JSON.stringify({ message: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (requiredRole && !hasRequiredRole(token.role, requiredRole)) {
    if (isProtectedApi) {
      return new NextResponse(JSON.stringify({ error: 'Accès interdit' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const unauthorizedUrl = new URL('/unauthorized', req.url);
    unauthorizedUrl.searchParams.set('from', pathname);
    unauthorizedUrl.searchParams.set('requiredRole', requiredRole);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.webp$|api/auth).*)'],
};
