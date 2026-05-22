import { NextRequest, NextResponse } from 'next/server';
import { authFromTokenResponse, exchangeAuthorizationCode } from '@/lib/openai-account';
import { OPENAI_ACCOUNT_ENABLED_KEY, OPENAI_ACCOUNT_STORAGE_KEY, OPENAI_ACCOUNTS_STORAGE_KEY } from '@/lib/openai-account-shared';

const COOKIE_NAME = 'openai-oauth-pkce';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));
}

function htmlResponse(html: string, status = 200) {
  const response = new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    },
  });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const rawCookie = request.cookies.get(COOKIE_NAME)?.value;

  try {
    if (!code || !state || !rawCookie) throw new Error('Missing OpenAI callback data.');
    const saved = JSON.parse(rawCookie) as { verifier?: string; state?: string };
    if (!saved.verifier || saved.state !== state) throw new Error('OpenAI callback state did not match.');

    const tokenResponse = await exchangeAuthorizationCode({ code, redirectUri: `${request.nextUrl.origin}/api/openai-account/callback`, verifier: saved.verifier });
    const auth = authFromTokenResponse(tokenResponse);
    const authJson = JSON.stringify(auth).replace(/</g, '\\u003c');

    return htmlResponse(`<!doctype html>
<html><head><title>OpenAI connected</title><style>
body{margin:0;background:#1a1a1a;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;display:grid;place-items:center;min-height:100dvh}.box{border:1px solid #333;background:#141414;padding:24px;max-width:520px}.k{color:#af8787;text-transform:uppercase;font-size:11px;letter-spacing:.14em}.m{color:#777;font-size:12px;line-height:1.6}
</style></head><body><div class="box"><div class="k">OpenAI connected</div><p class="m">Token saved in this browser. You can close this tab.</p></div><script>
const auth = JSON.parse(${JSON.stringify(authJson)});
const accountId = auth.accountId || auth.email || auth.refreshToken.slice(0, 16);
const now = Date.now();
let accounts = [];
try { accounts = JSON.parse(localStorage.getItem('${OPENAI_ACCOUNTS_STORAGE_KEY}') || '[]'); } catch { accounts = []; }
const existing = accounts.find(a => a.id === accountId);
accounts = [...accounts.filter(a => a.id !== accountId), { ...(existing || {}), id: accountId, auth, enabled: true, addedAt: existing?.addedAt || now, updatedAt: now }];
localStorage.setItem('${OPENAI_ACCOUNTS_STORAGE_KEY}', JSON.stringify(accounts));
localStorage.setItem('${OPENAI_ACCOUNT_STORAGE_KEY}', JSON.stringify(auth));
localStorage.setItem('${OPENAI_ACCOUNT_ENABLED_KEY}', 'true');
window.dispatchEvent(new Event('cracker-openai-account-change'));
if (window.opener) window.opener.postMessage({ type: 'cracker-openai-connected' }, window.location.origin);
setTimeout(() => window.close(), 900);
</script></body></html>`);
  } catch (error) {
    const message = escapeHtml(error instanceof Error ? error.message : 'OpenAI connection failed.');
    return htmlResponse(`<!doctype html><title>OpenAI connection failed</title><body style="margin:0;background:#1a1a1a;color:#fff;font-family:monospace;display:grid;place-items:center;min-height:100dvh"><div style="border:1px solid #333;background:#141414;padding:24px"><div style="color:#af8787;text-transform:uppercase;font-size:11px;letter-spacing:.14em">Connection failed</div><p style="color:#777;font-size:12px">${message}</p></div></body>`, 400);
  }
}
