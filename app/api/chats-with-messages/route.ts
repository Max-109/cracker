import { getDb } from '@/db';
import { chats, messages } from '@/db/schema';
import { desc, eq, inArray, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { classifyDbError } from '@/lib/db-errors';
import { getChatDek, decryptContent, decryptTitle } from '@/lib/encryption';

// Default page size - enough to fill the visible sidebar
const DEFAULT_LIMIT = 15;

export async function GET(request: Request) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse pagination params from URL
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeMessages = searchParams.get('includeMessages') === '1';

    // Get paginated chats
    const paginatedChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, user.id))
      .orderBy(desc(chats.createdAt))
      .limit(limit)
      .offset(offset);

    const chatIds = paginatedChats.map(chat => chat.id);

    // Pre-fetch all DEKs for efficiency
    const dekMap = new Map<string, Buffer | null>();
    for (const chatId of chatIds) {
      dekMap.set(chatId, await getChatDek(chatId));
    }

    // Decrypt chat titles
    const decryptedChats = paginatedChats.map(chat => ({
      ...chat,
      title: decryptTitle(chat.title, dekMap.get(chat.id) || null),
    }));

    if (!includeMessages) {
      return NextResponse.json({
        chats: decryptedChats,
        hasMore: paginatedChats.length === limit,
        offset,
        limit,
      });
    }

    const allMessages =
      chatIds.length > 0
        ? await db
          .select()
          .from(messages)
          .where(inArray(messages.chatId, chatIds))
          .orderBy(asc(messages.createdAt))
        : [];

    // Decrypt all messages
    const decryptedMessages = allMessages.map(msg => {
      const dek = dekMap.get(msg.chatId);
      return {
        ...msg,
        content: dek ? decryptContent(msg.content, dek) : msg.content,
      };
    });

    const messagesByChatId: Record<string, typeof decryptedMessages> = {};
    for (const message of decryptedMessages) {
      (messagesByChatId[message.chatId] ||= []).push(message);
    }

    const result = decryptedChats.map(chat => ({
      ...chat,
      messages: messagesByChatId[chat.id] || [],
    }));

    // Return with pagination info
    return NextResponse.json({
      chats: result,
      hasMore: paginatedChats.length === limit,
      offset: offset,
      limit: limit
    });
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while fetching chats.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }

    console.error('Failed to fetch chats with messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chats with messages', code: classified.code }, { status: classified.status });
  }
}

