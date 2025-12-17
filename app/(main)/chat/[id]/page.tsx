'use client';

import ChatInterface from '@/app/components/ChatInterface';
import { use } from 'react';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ChatInterface key={id} initialChatId={id} />;
}
