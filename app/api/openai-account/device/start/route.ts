import { NextResponse } from 'next/server';
import { requestOpenAIDeviceCode } from '@/lib/openai-account';

export async function POST() {
  try {
    const device = await requestOpenAIDeviceCode();
    return NextResponse.json({ device, verificationUrl: 'https://auth.openai.com/codex/device' });
  } catch (error) {
    console.warn('[OpenAI account] device start failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'OpenAI device login failed' }, { status: 502 });
  }
}
