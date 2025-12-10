import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

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
    // fast: gemini-2.5-flash (Fast, accurate, stable)
    // expert: gemini-3-pro-preview (Most capable, expert model)
    const modelId = modelType === 'expert' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';

    console.log(`[Transcribe] Using model: ${modelId} (type: ${modelType})`);

    // Use direct SDK to avoid Vercel AI SDK validation issues with audio files
    const model = genAI.getGenerativeModel({ model: modelId });

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

    console.log(`[Transcribe] Success with ${modelId}, transcription length: ${transcription.length}`);

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error('[Transcribe] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
