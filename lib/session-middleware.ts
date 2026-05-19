import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { APP_SESSION_COOKIE, GUEST_SESSION_COOKIE } from '@/lib/auth';

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SESSION_SECRET ||
    process.env.GUEST_SESSION_SECRET ||
    'auth-session-secret-key-change-in-production',
  );
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const tokens = [
    request.cookies.get(APP_SESSION_COOKIE)?.value,
    request.cookies.get(GUEST_SESSION_COOKIE)?.value,
  ].filter(Boolean) as string[];

  for (const token of tokens) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (payload.sub) return true;
    } catch {
      // Try the next cookie.
    }
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthenticated = await hasValidSession(request);

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
