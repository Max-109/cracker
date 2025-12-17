/**
 * Final test - simulates what the frontend should now send
 * Run with: bun scripts/test-final.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/chat';
const PDF_PATH = path.join(__dirname, '..', 'mat_1_2023_ND_2_pavyzdys.pdf');

async function test() {
  console.log('=== Final Test: Frontend Format ===\n');

  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString('base64');
  const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

  // This matches what the fixed ChatInterface.tsx should send
  const messages = [
    {
      id: 'test-1',
      role: 'user',
      parts: [
        { type: 'text', text: 'Describe this document briefly.' },
        { type: 'file', filename: 'document.pdf', mediaType: 'application/pdf', url: dataUrl }
      ]
    }
  ];

  console.log('Sending message with PDF attachment...\n');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: 'gemini-2.5-flash',
      reasoningEffort: 'low',
      responseLength: 30,
    }),
  });

  console.log(`Response: ${response.status} ${response.statusText}\n`);

  const reader = response.body?.getReader();
  if (!reader) {
    console.log('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let result = '';
  let hasError = false;

  console.log('--- Model Response ---');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'text-delta') {
            process.stdout.write(data.delta);
            result += data.delta;
          }
          if (data.type === 'reasoning-delta') {
            // Skip reasoning for cleaner output
          }
          if (data.type === 'error') {
            console.log('\n\n❌ ERROR:', data.errorText.substring(0, 300));
            hasError = true;
          }
        } catch {}
      }
    }
  }

  console.log('\n--- End Response ---\n');

  if (hasError) {
    console.log('❌ TEST FAILED');
    process.exit(1);
  } else if (result.length > 0) {
    console.log('✅ TEST PASSED - Model received and processed the PDF');
  } else {
    console.log('⚠️  No response text (but no error either)');
  }
}

test().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
