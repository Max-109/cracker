/**
 * Test script to verify the exact message format expected by the AI SDK
 * Run with: bun scripts/test-attachment-format.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/chat';
const PDF_PATH = path.join(__dirname, '..', 'mat_1_2023_ND_2_pavyzdys.pdf');

interface TextPart {
  type: 'text';
  text: string;
}

interface FilePart {
  type: 'file';
  filename: string;
  mediaType: string;
  url: string; // Data URL
}

interface ImagePart {
  type: 'image';
  image: string; // Data URL
  mimeType?: string;
}

type MessagePart = TextPart | FilePart | ImagePart;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
}

async function testCorrectFormat() {
  console.log('=== Testing CORRECT format (from AI SDK docs) ===\n');

  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString('base64');
  const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

  // Correct format per AI SDK docs
  const messages: Message[] = [
    {
      id: 'test-msg-1',
      role: 'user',
      parts: [
        { type: 'text', text: 'What is this document about? Be brief.' },
        { type: 'file', filename: 'test.pdf', mediaType: 'application/pdf', url: dataUrl }
      ]
    }
  ];

  console.log('Message format:');
  console.log(JSON.stringify({
    role: messages[0].role,
    parts: messages[0].parts.map(p => ({
      type: p.type,
      ...(p.type === 'text' ? { text: p.text.substring(0, 30) + '...' } : {}),
      ...(p.type === 'file' ? { filename: (p as FilePart).filename, mediaType: (p as FilePart).mediaType, urlLength: (p as FilePart).url.length } : {}),
    }))
  }, null, 2));

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

  console.log(`\nResponse: ${response.status}`);
  
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'text-delta') {
            process.stdout.write(data.delta);
            result += data.delta;
          }
          if (data.type === 'error') {
            console.log('\n\nERROR:', data.errorText);
          }
        } catch {}
      }
    }
  }

  console.log('\n\n' + (result ? '✅ SUCCESS' : '❌ FAILED'));
}

async function testWrongFormat() {
  console.log('\n\n=== Testing WRONG format (what frontend sends) ===\n');

  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString('base64');
  const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

  // Wrong format - using 'data' and 'mimeType' instead of 'url' and 'mediaType'
  const messages = [
    {
      id: 'test-msg-2',
      role: 'user',
      parts: [
        { type: 'text', text: 'What is this document about? Be brief.' },
        { type: 'file', data: pdfBase64, mimeType: 'application/pdf' } // WRONG!
      ]
    }
  ];

  console.log('Message format:');
  console.log(JSON.stringify({
    role: messages[0].role,
    parts: messages[0].parts.map(p => ({
      type: p.type,
      ...(p.type === 'text' ? { text: (p as { text: string }).text.substring(0, 30) + '...' } : {}),
      ...(p.type === 'file' ? { 
        data: 'base64...(length: ' + ((p as { data?: string }).data?.length || 0) + ')',
        mimeType: (p as { mimeType?: string }).mimeType 
      } : {}),
    }))
  }, null, 2));

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

  console.log(`\nResponse: ${response.status}`);
  
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let hasError = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'text-delta') {
            process.stdout.write(data.delta);
          }
          if (data.type === 'error') {
            console.log('\nERROR:', data.errorText.substring(0, 200) + '...');
            hasError = true;
          }
        } catch {}
      }
    }
  }

  console.log('\n\n' + (hasError ? '❌ FAILED (as expected with wrong format)' : '✅ Unexpectedly worked'));
}

async function main() {
  try {
    await testCorrectFormat();
    await testWrongFormat();
  } catch (e) {
    console.error('Test error:', e);
  }
}

main();
