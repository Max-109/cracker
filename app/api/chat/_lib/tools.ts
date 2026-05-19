import { getEnabledBraveTools } from '@/lib/tools/brave-tools';
import { getEnabledYouTubeTools } from '@/lib/tools/youtube-tools';

export function resolveChatTools(enabledMcpServers: unknown) {
  const mcpServers: string[] = Array.isArray(enabledMcpServers) ? enabledMcpServers : ['brave-search'];
  const braveTools = getEnabledBraveTools(mcpServers);
  const youtubeTools = getEnabledYouTubeTools(mcpServers);
  const tools = { ...braveTools, ...youtubeTools };

  console.log('[API] Received enabledMcpServers:', enabledMcpServers, '-> mcpServers:', mcpServers);
  console.log('[API] Tools check - mcpServers:', mcpServers, '- resolved tools:', Object.keys(tools));

  return {
    mcpServers,
    tools,
    hasTools: Object.keys(tools).length > 0,
  };
}

export function requestContainsImages(messages: Array<{ parts?: unknown[] }>) {
  return messages.some((msg) =>
    Array.isArray(msg.parts) && msg.parts.some((part) => {
      const p = part as { type?: string; mediaType?: string; mimeType?: string };
      return p.type === 'image' || p.mediaType?.startsWith('image/') || p.mimeType?.startsWith('image/');
    })
  );
}
