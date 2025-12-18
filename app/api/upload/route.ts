import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // Authenticate user here if needed
                // const { user } = await auth();
                // if (!user) throw new Error('Unauthorized');

                return {
                    allowedContentTypes: [
                        'application/pdf',
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'image/gif',
                        'text/plain',
                        'text/markdown',
                        'text/csv',
                        'application/json',
                        // Video types
                        'video/mp4',
                        'video/webm',
                        'video/quicktime', // .mov
                        'video/x-msvideo', // .avi
                    ],
                    tokenPayload: JSON.stringify({
                        // optional payload to save in metadata or use in onUploadCompleted
                        uploadTime: Date.now(),
                    }),
                };
            },

        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
