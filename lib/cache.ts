import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatCacheSchema extends DBSchema {
  chats: {
    key: string;
    value: {
      id: string;
      title: string | null;
      mode?: 'chat' | 'learning' | 'deep-search';
      createdAt: string;
      messages: Array<{
        id: string;
        chatId: string;
        role: string;
        content: any;
        model?: string;
        tokensPerSecond?: string;
        createdAt: string;
      }>;
    };
    indexes: { 'by-createdAt': string; };
  };
  cacheMetadata: {
    key: string;
    value: {
      lastUpdated: number;
      version: number;
    };
  };
  cacheFallback: {
    key: string;
    value: {
      id: string;
      title: string | null;
      mode?: 'chat' | 'learning' | 'deep-search';
      createdAt: string;
      messages: any[];
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ChatCacheSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<ChatCacheSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ChatCacheSchema>('chat-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('chats')) {
          const store = db.createObjectStore('chats', { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('cacheMetadata')) {
          db.createObjectStore('cacheMetadata');
        }
        if (!db.objectStoreNames.contains('cacheFallback')) {
          db.createObjectStore('cacheFallback');
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheChats(chats: Array<{
  id: string;
  title: string | null;
  mode?: 'chat' | 'learning' | 'deep-search';
  createdAt: string;
  messages: any[];
}>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('chats', 'readwrite');

  // Clear existing cache
  await tx.store.clear();

  // Bulk add all chats using Promise.all for better performance
  await Promise.all(chats.map(chat => tx.store.put(chat)));

  // Complete the transaction first
  await tx.done;

  // Update metadata in a separate transaction (safer than mixing with data writes)
  await db.put('cacheMetadata', {
    lastUpdated: Date.now(),
    version: 1
  }, 'metadata');
}

export async function getCachedChats(): Promise<Array<{
  id: string;
  title: string | null;
  mode?: 'chat' | 'learning' | 'deep-search';
  createdAt: string;
  messages: any[];
}> | null> {
  try {
    const db = await getDB();
    const metadata = await db.get('cacheMetadata', 'metadata');

    // If cache is stale (older than 5 minutes), return null to force refresh
    if (metadata && Date.now() - metadata.lastUpdated > 5 * 60 * 1000) {
      return null;
    }

    const chats = await db.getAll('chats');
    return chats.length > 0 ? chats : null;
  } catch (error) {
    console.error('Failed to read from cache:', error);
    return null;
  }
}

export async function getCachedChat(chatId: string): Promise<{
  id: string;
  title: string | null;
  mode?: 'chat' | 'learning' | 'deep-search';
  createdAt: string;
  messages: any[];
} | null> {
  try {
    const db = await getDB();
    const result = await db.get('chats', chatId);

    // Handle the case where result might be undefined
    if (result) {
      return {
        id: result.id,
        title: result.title,
        mode: result.mode,
        createdAt: result.createdAt,
        messages: result.messages || []
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to read chat from cache:', error);
    return null;
  }
}

export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear('chats');
  await db.delete('cacheMetadata', 'metadata');
}