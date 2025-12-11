import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { desc, eq, inArray, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// Default page size - enough to fill the visible sidebar
const DEFAULT_LIMIT = 15;

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse pagination params from URL
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get paginated chats
    const paginatedChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, user.id))
      .orderBy(desc(chats.createdAt))
      .limit(limit)
      .offset(offset);

    // For each chat, get its messages in a single batched query
    const chatIds = paginatedChats.map(chat => chat.id);

    // Get messages only for the chats we're returning
    const allMessages = chatIds.length > 0
      ? await db
        .select()
        .from(messages)
        .where(inArray(messages.chatId, chatIds))
        .orderBy(asc(messages.createdAt))
      : [];

    // Group messages by chatId
    const messagesByChatId: Record<string, typeof allMessages> = {};
    allMessages.forEach(message => {
      if (!messagesByChatId[message.chatId]) {
        messagesByChatId[message.chatId] = [];
      }
      messagesByChatId[message.chatId].push(message);
    });

    // Combine chats with their messages
    const result = paginatedChats.map(chat => ({
      ...chat,
      messages: messagesByChatId[chat.id] || []
    }));

    // Return with pagination info
    return NextResponse.json({
      chats: result,
      hasMore: paginatedChats.length === limit, // If we got full page, there might be more
      offset: offset,
      limit: limit
    });
  } catch (error) {
    console.error('Failed to fetch chats with messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chats with messages' }, { status: 500 });
  }
}