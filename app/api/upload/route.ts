import { NextResponse } from 'next/server';
import {
  cleanupStaleTempAttachments,
  deleteTempAttachment,
  isValidTempAttachmentId,
  readTempAttachment,
  saveTempAttachment,
} from '@/lib/temp-attachments';

export async function POST(request: Request) {
  try {
    cleanupStaleTempAttachments().catch(() => undefined);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const attachment = await saveTempAttachment(file);

    return NextResponse.json({
      id: attachment.id,
      url: `/api/upload?id=${attachment.id}`,
      temporary: true,
      pathname: attachment.id,
      contentType: attachment.mediaType,
      size: attachment.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const status = message === 'File too large' ? 413 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';

  if (!isValidTempAttachmentId(id)) {
    return NextResponse.json({ error: 'Invalid attachment id' }, { status: 400 });
  }

  const attachment = await readTempAttachment(id);
  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  return new Response(attachment.data, {
    headers: {
      'Content-Type': attachment.meta.mediaType,
      'Content-Length': String(attachment.meta.size),
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.meta.name)}"`,
      'Cache-Control': 'private, max-age=0, no-store',
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';

  if (!isValidTempAttachmentId(id)) {
    return NextResponse.json({ error: 'Invalid attachment id' }, { status: 400 });
  }

  await deleteTempAttachment(id);
  return NextResponse.json({ success: true });
}
