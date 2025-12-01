'use client';

import { createContext, useContext } from 'react';

interface Chat {
  id: string;
  title: string | null;
  mode?: 'chat' | 'learning' | 'deep-search';
  createdAt: string;
}

interface ChatContextType {
  chats: Chat[];
  isLoading: boolean;
  refreshChats: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
