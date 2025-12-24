import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Retry configuration for transient API errors (503, 429, etc.)
// Will retry indefinitely until success, with delay capped at MAX_DELAY_MS
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

// Helper to check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Check for common transient errors
    if (message.includes('503') ||
      message.includes('overloaded') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('service unavailable') ||
      message.includes('temporarily unavailable')) {
      return true;
    }
  }
  return false;
}

// Helper to delay with exponential backoff
function delay(attempt: number): Promise<void> {
  const delayMs = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delayMs * 0.25 * (Math.random() - 0.5);
  return new Promise(resolve => setTimeout(resolve, delayMs + jitter));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert audio file to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/webm';

    console.log(`[Transcribe] Input: ${audioFile.size} bytes, type: ${mimeType}, base64 len: ${base64Audio.length}`);

    const modelType = formData.get('model') as string || 'fast';

    // Select model based on type
    // fast: gemini-3-flash-preview (Fast, accurate, stable)
    // expert: gemini-3-pro-preview (Most capable, expert model)
    const modelId = modelType === 'expert' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    console.log(`[Transcribe] Using model: ${modelId} (type: ${modelType})`);

    // Use direct SDK to avoid Vercel AI SDK validation issues with audio files
    const model = genAI.getGenerativeModel({ model: modelId });

    // Retry logic with exponential backoff - keeps trying until success
    let attempt = 0;
    while (true) {
      try {
        if (attempt > 0) {
          console.log(`[Transcribe] Retry attempt ${attempt} for ${modelId}`);
        }

        const result = await model.generateContent([
          "Transcribe this audio as accurately as possible. Return ONLY the transcribed text, nothing else. If the audio is unclear or empty, return an empty string.",
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          }
        ]);

        const response = await result.response;
        const transcription = response.text().trim();

        console.log(`[Transcribe] Success with ${modelId}${attempt > 0 ? ` on retry ${attempt}` : ''}, transcription length: ${transcription.length}`);

        return NextResponse.json({ text: transcription });
      } catch (error) {
        // Check if this is a retryable error
        if (isRetryableError(error)) {
          console.log(`[Transcribe] Retryable error on attempt ${attempt + 1}:`,
            error instanceof Error ? error.message : 'Unknown error');
          await delay(attempt);
          attempt++;
          continue;
        }

        // Non-retryable error - throw to outer catch
        throw error;
      }
    }
  } catch (error) {
    console.error('[Transcribe] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
