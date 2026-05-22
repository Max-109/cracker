import { NextRequest, NextResponse } from 'next/server';
import { refreshOpenAIAccountAuth } from '@/lib/openai-account';
import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';

export async function POST(request: NextRequest) {
  try {
    const { auth } = await request.json() as { auth?: OpenAIAccountAuth };
    if (!auth?.refreshToken) {
      return NextResponse.json({ error: 'Missing OpenAI account token' }, { status: 400 });
    }
    const refreshed = await refreshOpenAIAccountAuth(auth);
    return NextResponse.json({ auth: refreshed });
  } catch (error) {
    console.warn('[OpenAI account] refresh failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'OpenAI account refresh failed' }, { status: 401 });
  }
}
