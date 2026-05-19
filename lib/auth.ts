import { jwtVerify, SignJWT } from 'jose';
import { cookies, headers } from 'next/headers';

export const APP_SESSION_COOKIE = 'app-session';
export const GUEST_SESSION_COOKIE = 'guest-session';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SESSION_SECRET ||
    process.env.GUEST_SESSION_SECRET ||
    'auth-session-secret-key-change-in-production',
  );
}

export interface AuthUser {
  id: string;
  email: string;
  isGuest: boolean;
  guestLogin?: string;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}

export async function createAuthToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    isGuest: user.isGuest,
    guestLogin: user.guestLogin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== 'string') return null;

    return {
      id: payload.sub,
      email: payload.email,
      isGuest: payload.isGuest === true,
      guestLogin: typeof payload.guestLogin === 'string' ? payload.guestLogin : undefined,
    };
  } catch {
    return null;
  }
}

async function getBearerUser(): Promise<AuthUser | null> {
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAuthToken(authHeader.slice(7));
}

async function getCookieUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  const appToken = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (appToken) {
    const user = await verifyAuthToken(appToken);
    if (user && !user.isGuest) return user;
  }

  const guestToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (guestToken) {
    const user = await verifyAuthToken(guestToken);
    if (user?.isGuest) return user;
  }

  return null;
}

/**
 * Get the authenticated user from app JWT cookie, guest JWT cookie, or Bearer token.
 * Supports web cookie auth and mobile Bearer auth.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  return (await getBearerUser()) || (await getCookieUser());
}
