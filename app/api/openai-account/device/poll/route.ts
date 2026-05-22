import { NextRequest, NextResponse } from 'next/server';
import { authFromTokenResponse, exchangeDeviceToken, pollOpenAIDeviceCode } from '@/lib/openai-account';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { device_auth_id?: string; user_code?: string };
    if (!body.device_auth_id || !body.user_code) {
      return NextResponse.json({ error: 'Missing device login data' }, { status: 400 });
    }

    const deviceToken = await pollOpenAIDeviceCode({ device_auth_id: body.device_auth_id, user_code: body.user_code });
    if (!deviceToken) return NextResponse.json({ pending: true });

    const tokenResponse = await exchangeDeviceToken(deviceToken);
    return NextResponse.json({ pending: false, auth: authFromTokenResponse(tokenResponse) });
  } catch (error) {
    console.warn('[OpenAI account] device poll failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'OpenAI device login failed' }, { status: 502 });
  }
}
