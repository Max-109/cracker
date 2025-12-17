/**
 * Test script for PDF attachment support with Vertex AI
 * Run with: bun scripts/test-attachment.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/chat';
const PDF_PATH = path.join(__dirname, '..', 'mat_1_2023_ND_2_pavyzdys.pdf');

async function testPdfAttachment() {
  console.log('=== PDF Attachment Test ===\n');

  // 1. Read and encode the PDF
  console.log('1. Reading PDF file...');
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF not found at: ${PDF_PATH}`);
    process.exit(1);
  }

  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString('base64');
  console.log(`   PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`   Base64 length: ${pdfBase64.length} chars\n`);

  // 2. Construct the message with PDF attachment
  console.log('2. Constructing multimodal message...');
  
  // Format according to AI SDK docs: type: 'file', filename, mediaType, url (data URL)
  const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
  
  const messages = [
    {
      id: 'test-msg-1',
      role: 'user',
      parts: [
        { type: 'text', text: 'I have attached a PDF file. Please confirm you can see it and briefly describe what type of document it is (e.g., is it a math exam, a report, etc.). Just tell me what you see.' },
        { type: 'file', filename: 'mat_1_2023_ND_2_pavyzdys.pdf', mediaType: 'application/pdf', url: dataUrl }
      ]
    }
  ];

  console.log('   Message structure:');
  const textPart = messages[0].parts[0] as { type: string; text?: string };
  console.log(`   - Text part: "${textPart.text?.substring(0, 50)}..."`);
  console.log(`   - File part: type=file, mediaType=application/pdf, url length=${dataUrl.length}\n`);

  // 3. Send request to the API
  console.log('3. Sending request to API...');
  console.log(`   URL: ${API_URL}`);
  console.log(`   Model: gemini-2.5-flash (Balanced)\n`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: 'gemini-2.5-flash',
        reasoningEffort: 'low',
        responseLength: 30,
      }),
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API Error:');
      console.error(errorText);
      process.exit(1);
    }

    // 4. Read streaming response
    console.log('\n4. Reading streaming response...\n');
    console.log('--- Model Response ---');
    
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('No response body');
      process.exit(1);
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let rawData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      rawData += chunk;
      
      // Parse SSE format
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            // Handle text-delta events
            if (data.type === 'text-delta' && data.delta) {
              process.stdout.write(data.delta);
              fullResponse += data.delta;
            }
            // Handle reasoning-delta events (show in gray)
            if (data.type === 'reasoning-delta' && data.delta) {
              process.stdout.write(`\x1b[90m${data.delta}\x1b[0m`);
            }
          } catch {
            // Not valid JSON
          }
        } else if (line.startsWith('0:')) {
          // Old format - text content
          try {
            const text = JSON.parse(line.substring(2));
            process.stdout.write(text);
            fullResponse += text;
          } catch {
            // Not JSON
          }
        }
      }
    }

    // Debug: show raw data if no response
    if (fullResponse.length === 0) {
      console.log('\n   [DEBUG] Raw stream data:');
      console.log(rawData.substring(0, 2000));
      if (rawData.length > 2000) console.log('   ... (truncated)');
    }

    console.log('\n\n--- End Response ---\n');

    // 5. Analyze result
    console.log('5. Analysis:');
    if (fullResponse.length > 0) {
      console.log('   ✅ Received response from model');
      const lowerResponse = fullResponse.toLowerCase();
      if (lowerResponse.includes('math') || lowerResponse.includes('exam') || 
          lowerResponse.includes('test') || lowerResponse.includes('problem') ||
          lowerResponse.includes('pdf') || lowerResponse.includes('document') ||
          lowerResponse.includes('matematika') || lowerResponse.includes('egzamin')) {
        console.log('   ✅ Model appears to have understood the PDF content');
      } else {
        console.log('   ⚠️  Could not confirm model understood PDF (check response above)');
      }
    } else {
      console.log('   ❌ No response received');
    }

  } catch (error) {
    console.error('\n❌ Request failed:');
    console.error(error);
    process.exit(1);
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testPdfAttachment();
