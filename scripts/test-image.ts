/**
 * Test script for IMAGE attachment support
 * Run with: bun scripts/test-image.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/chat';

// Find an image file in the project
function findImageFile(): string | null {
  const possiblePaths = [
    path.join(__dirname, '..', 'document.png'),
    path.join(__dirname, '..', 'document.jpg'),
    path.join(__dirname, '..', 'document.jpeg'),
    path.join(__dirname, '..', 'public', 'favicon.ico'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Look for any image in current directory
  const files = fs.readdirSync(path.join(__dirname, '..'));
  for (const file of files) {
    if (file.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      return path.join(__dirname, '..', file);
    }
  }
  
  return null;
}

async function testImageFormat(formatName: string, imagePart: object) {
  console.log(`\n--- Testing: ${formatName} ---`);
  console.log('Part format:', JSON.stringify(imagePart, (k, v) => 
    typeof v === 'string' && v.length > 100 ? v.substring(0, 50) + '...[truncated]' : v
  , 2));

  const messages = [
    {
      id: 'test-img-1',
      role: 'user',
      parts: [
        { type: 'text', text: 'Do you see an image? If yes, describe what you see in 1-2 sentences. If no, say "NO IMAGE RECEIVED".' },
        imagePart
      ]
    }
  ];

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

    console.log(`Response: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) return { success: false, response: 'No body' };

    const decoder = new TextDecoder();
    let result = '';
    let hasError = false;
    let errorText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'text-delta') {
              result += data.delta;
            }
            if (data.type === 'error') {
              hasError = true;
              errorText = data.errorText?.substring(0, 200) || 'Unknown error';
            }
          } catch {}
        }
      }
    }

    if (hasError) {
      console.log('❌ ERROR:', errorText);
      return { success: false, response: errorText };
    }

    console.log('Response:', result.substring(0, 200));
    
    const seesImage = !result.toLowerCase().includes('no image') && 
                      !result.toLowerCase().includes("don't see") &&
                      !result.toLowerCase().includes("cannot see") &&
                      !result.toLowerCase().includes("can't see") &&
                      result.length > 10;
    
    console.log(seesImage ? '✅ Model SEES the image' : '❌ Model does NOT see the image');
    return { success: seesImage, response: result };
  } catch (e) {
    console.log('❌ Request failed:', e);
    return { success: false, response: String(e) };
  }
}

async function main() {
  console.log('=== Image Attachment Test ===\n');

  // Find an image
  const imagePath = findImageFile();
  if (!imagePath) {
    console.log('No image file found. Creating a simple test image...');
    // Create a simple 1x1 red PNG
    const simplePng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xFE, 0xD4, 0xEF, 0x00, 0x00,
      0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(path.join(__dirname, 'test-image.png'), simplePng);
  }

  const testImagePath = imagePath || path.join(__dirname, 'test-image.png');
  console.log('Using image:', testImagePath);

  const imageBuffer = fs.readFileSync(testImagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(testImagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`MIME type: ${mimeType}`);
  console.log(`Data URL length: ${dataUrl.length}`);

  const results: { name: string; success: boolean }[] = [];

  // Test Format 1: What we currently send (image with just 'image' property)
  const r1 = await testImageFormat('Current format: { type: "image", image: dataUrl }', {
    type: 'image',
    image: dataUrl
  });
  results.push({ name: 'image + dataUrl', success: r1.success });

  // Test Format 2: With mimeType
  const r2 = await testImageFormat('With mimeType: { type: "image", image: dataUrl, mimeType }', {
    type: 'image',
    image: dataUrl,
    mimeType: mimeType
  });
  results.push({ name: 'image + dataUrl + mimeType', success: r2.success });

  // Test Format 3: Using 'url' instead of 'image'
  const r3 = await testImageFormat('Using url: { type: "image", url: dataUrl }', {
    type: 'image',
    url: dataUrl
  });
  results.push({ name: 'image + url', success: r3.success });

  // Test Format 4: File type for image
  const r4 = await testImageFormat('As file: { type: "file", filename, mediaType, url }', {
    type: 'file',
    filename: 'image.png',
    mediaType: mimeType,
    url: dataUrl
  });
  results.push({ name: 'file format', success: r4.success });

  // Test Format 5: Just base64 without data URL prefix
  const r5 = await testImageFormat('Raw base64: { type: "image", image: base64 }', {
    type: 'image',
    image: base64
  });
  results.push({ name: 'image + raw base64', success: r5.success });

  // Summary
  console.log('\n\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  }

  const working = results.filter(r => r.success);
  if (working.length > 0) {
    console.log(`\n✅ Working format(s): ${working.map(r => r.name).join(', ')}`);
  } else {
    console.log('\n❌ No format worked!');
  }
}

main().catch(console.error);
