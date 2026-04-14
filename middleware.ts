import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/'];
const ADMIN_PATHS = ['/admin'];
const POS_PATHS = ['/pos'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session')?.value;

  const isAuthenticated = !!sessionCookie;

  // Redirect authenticated users away from login
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Protect admin and pos routes
  const isProtected =
    ADMIN_PATHS.some((p) => pathname.startsWith(p)) ||
    POS_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
