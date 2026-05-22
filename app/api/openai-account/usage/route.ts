import { NextRequest, NextResponse } from 'next/server';
import { fetchOpenAIUsageWithAuth, refreshOpenAIAccountAuth } from '@/lib/openai-account';
import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';

export async function POST(request: NextRequest) {
  try {
    const { auth } = await request.json() as { auth?: OpenAIAccountAuth };
    if (!auth?.accessToken || !auth.refreshToken) {
      return NextResponse.json({ error: 'Missing OpenAI account token' }, { status: 400 });
    }

    const freshAuth = auth.expiresAtMillis < Date.now() + 30_000
      ? await refreshOpenAIAccountAuth(auth)
      : auth;
    const usage = await fetchOpenAIUsageWithAuth(freshAuth);
    return NextResponse.json({ auth: freshAuth, usage });
  } catch (error) {
    console.warn('[OpenAI account] usage failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'OpenAI usage unavailable' }, { status: 502 });
  }
}
