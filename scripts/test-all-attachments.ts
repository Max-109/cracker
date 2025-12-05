/**
 * Comprehensive test for ALL attachment types (images + PDFs)
 * Run with: bun scripts/test-all-attachments.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/chat';

async function testAttachment(name: string, parts: object[]) {
  console.log(`\n--- Testing: ${name} ---`);

  const messages = [{
    id: 'test-1',
    role: 'user',
    parts
  }];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: 'gemini-2.5-flash',
        reasoningEffort: 'low',
        responseLength: 20,
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let result = '';
    let hasError = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'text-delta') result += data.delta;
            if (data.type === 'error') {
              console.log('❌ Error:', data.errorText?.substring(0, 150));
              hasError = true;
            }
          } catch {}
        }
      }
    }

    if (hasError) return false;
    
    console.log('Response:', result.substring(0, 150) + (result.length > 150 ? '...' : ''));
    
    const success = result.length > 20 && 
      !result.toLowerCase().includes('no image') &&
      !result.toLowerCase().includes("don't see") &&
      !result.toLowerCase().includes("cannot see");
    
    console.log(success ? '✅ PASSED' : '❌ FAILED');
    return success;
  } catch (e) {
    console.log('❌ Error:', e);
    return false;
  }
}

async function main() {
  console.log('=== Comprehensive Attachment Test ===');
  console.log('Testing the CORRECT format: { type: "file", filename, mediaType, url }\n');

  const results: { name: string; passed: boolean }[] = [];

  // Test 1: PNG Image
  const pngPath = path.join(__dirname, '..', 'Document.png');
  if (fs.existsSync(pngPath)) {
    const pngBuffer = fs.readFileSync(pngPath);
    const pngDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    
    const passed = await testAttachment('PNG Image', [
      { type: 'text', text: 'What do you see in this image? Describe briefly.' },
      { type: 'file', filename: 'Document.png', mediaType: 'image/png', url: pngDataUrl }
    ]);
    results.push({ name: 'PNG Image', passed });
  } else {
    console.log('\n--- Skipping PNG test (Document.png not found) ---');
  }

  // Test 2: PDF Document
  const pdfPath = path.join(__dirname, '..', 'mat_1_2023_ND_2_pavyzdys.pdf');
  if (fs.existsSync(pdfPath)) {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    
    const passed = await testAttachment('PDF Document', [
      { type: 'text', text: 'What is this PDF document about? Brief answer.' },
      { type: 'file', filename: 'document.pdf', mediaType: 'application/pdf', url: pdfDataUrl }
    ]);
    results.push({ name: 'PDF Document', passed });
  } else {
    console.log('\n--- Skipping PDF test (mat_1_2023_ND_2_pavyzdys.pdf not found) ---');
  }

  // Test 3: Multiple attachments (image + text)
  if (fs.existsSync(pngPath)) {
    const pngBuffer = fs.readFileSync(pngPath);
    const pngDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    
    const passed = await testAttachment('Image with question', [
      { type: 'text', text: 'Is there any text visible in this image? What does it say?' },
      { type: 'file', filename: 'image.png', mediaType: 'image/png', url: pngDataUrl }
    ]);
    results.push({ name: 'Image with question', passed });
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  }
  
  console.log(`\nTotal: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('\n🎉 All attachment types working correctly!');
  } else {
    console.log('\n⚠️  Some tests failed - check the output above');
    process.exit(1);
  }
}

main().catch(console.error);
