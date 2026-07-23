import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/',
  '/cart',
  '/checkout',
  '/tracking',
  '/profile',
];

const AUTH_ROUTES = [
  '/login',
  '/register',
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('wolfie_auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname) || pathname.startsWith('/restaurant') || pathname.startsWith('/tracking');
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // If path is protected and there is no token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    // Remember redirect path if needed
    // loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If path is auth (login/register) and token exists, redirect to home
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|sw.js).*)',
  ],
};
