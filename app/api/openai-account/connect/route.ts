import { NextRequest, NextResponse } from 'next/server';
import { OPENAI_ACCOUNT_ENABLED_KEY, OPENAI_ACCOUNT_STORAGE_KEY } from '@/lib/openai-account-shared';

function getAccent(request: NextRequest) {
  const accent = request.nextUrl.searchParams.get('accent') || '#af8787';
  return /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#af8787';
}

export async function GET(request: NextRequest) {
  const accent = getAccent(request);

  return new NextResponse(`<!doctype html>
<html><head><title>Connect OpenAI</title><style>
body{margin:0;background:#1a1a1a;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;display:grid;place-items:center;min-height:100dvh}.box{border:1px solid #333;background:#141414;padding:24px;width:min(520px,calc(100vw - 32px))}.k{color:${accent};text-transform:uppercase;font-size:11px;letter-spacing:.14em}.m{color:#777;font-size:12px;line-height:1.6}.code{margin:18px 0;border:1px solid ${accent}66;background:${accent}14;color:${accent};font-size:30px;letter-spacing:.16em;text-align:center;padding:18px}.row{display:flex;gap:8px}.btn{border:1px solid ${accent};background:${accent};color:#000;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-size:11px;padding:10px 12px;text-decoration:none}.ghost{border-color:#333;background:#1a1a1a;color:#aaa}.err{color:#ff8a8a}
</style></head><body><div class="box"><div class="k">Connect OpenAI</div><p id="msg" class="m">Starting device login...</p><div id="code" class="code">------</div><div class="row"><a id="open" class="btn" href="https://auth.openai.com/codex/device" target="_blank" rel="noopener noreferrer">Open OpenAI</a><button id="copy" class="btn ghost">Copy code</button></div></div><script>
const storageKey = '${OPENAI_ACCOUNT_STORAGE_KEY}';
const enabledKey = '${OPENAI_ACCOUNT_ENABLED_KEY}';
const msg = document.getElementById('msg');
const code = document.getElementById('code');
const openLink = document.getElementById('open');
const copy = document.getElementById('copy');
let device = null;
let timer = null;
function setError(text){ msg.innerHTML = '<span class="err">' + text + '</span>'; }
async function start(){
  const res = await fetch('/api/openai-account/device/start', { method: 'POST' });
  if (!res.ok) throw new Error('Could not start OpenAI login.');
  const data = await res.json();
  device = data.device;
  code.textContent = device.user_code;
  openLink.href = data.verificationUrl;
  msg.textContent = 'Enter this code on OpenAI, then keep this window open.';
  window.open(data.verificationUrl, '_blank', 'noopener,noreferrer');
  timer = setInterval(poll, Math.max(3000, (parseInt(device.interval || '5', 10) + 2) * 1000));
}
async function poll(){
  if (!device) return;
  const res = await fetch('/api/openai-account/device/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(device) });
  if (!res.ok) throw new Error('OpenAI login failed.');
  const data = await res.json();
  if (data.pending) return;
  clearInterval(timer);
  localStorage.setItem(storageKey, JSON.stringify(data.auth));
  localStorage.setItem(enabledKey, 'true');
  msg.textContent = 'Connected. You can close this window.';
  if (window.opener) window.opener.postMessage({ type: 'cracker-openai-connected' }, window.location.origin);
  setTimeout(() => window.close(), 900);
}
copy.onclick = () => navigator.clipboard.writeText(code.textContent || '');
start().catch(error => setError(error.message || 'OpenAI login failed.'));
</script></body></html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    },
  });
}
