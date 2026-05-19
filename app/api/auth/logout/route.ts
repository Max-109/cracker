import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { APP_SESSION_COOKIE, GUEST_SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(APP_SESSION_COOKIE);
  cookieStore.delete(GUEST_SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
