import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

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

    // Determine mime type
    const mimeType = audioFile.type || 'audio/webm';

    // Get access token for Vertex AI using service account
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const modelType = formData.get('model') as string || 'fast';

    const projectId = process.env.GOOGLE_VERTEX_PROJECT;
    const location = process.env.GOOGLE_VERTEX_LOCATION || 'global';

    // Select model based on type
    // fast: gemini-2.5-flash-lite-preview-09-2025 (Fastest, lowest latency)
    // expert: gemini-3-pro-preview (Gemini 3.0 Preview - most accurate)
    const modelId = modelType === 'expert' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash-lite-preview-09-2025';

    console.log(`[Transcribe] Using model: ${modelId} (type: ${modelType})`);

    // Call Vertex AI API directly
    const response = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Transcribe this audio as accurately as possible. Return ONLY the transcribed text, nothing else. If the audio is unclear or empty, return an empty string.',
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Transcribe] Vertex AI error:', {
        status: response.status,
        statusText: response.statusText,
        modelId,
        errorData,
      });

      // Return more specific error to client
      return NextResponse.json(
        {
          error: `Vertex AI returned ${response.status}: ${response.statusText}`,
          details: errorData,
          modelId,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

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
