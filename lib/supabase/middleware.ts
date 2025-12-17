import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const GUEST_SESSION_SECRET = new TextEncoder().encode(
  process.env.GUEST_SESSION_SECRET || 'guest-session-secret-key-change-in-production'
);

async function verifyGuestSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('guest-session')?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, GUEST_SESSION_SECRET);
    return !!(payload.sub && payload.isGuest);
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Check for guest session if no Supabase user
  const hasGuestSession = !user && await verifyGuestSession(request);
  const isAuthenticated = !!user || hasGuestSession;

  // If not logged in and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access auth pages
  if (isAuthenticated && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
