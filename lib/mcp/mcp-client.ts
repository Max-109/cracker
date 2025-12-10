/**
 * MCP Client Manager
 * 
 * Handles connections to remote MCP servers using the Vercel AI SDK's MCP client.
 * This provides dynamic tool discovery and execution via the Model Context Protocol.
 */

import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import type { Tool } from 'ai';

export interface MCPServerConfig {
    slug: string;
    name: string;
    serverUrl: string;
    apiKey?: string;
}

// Built-in MCP server configurations
export const BUILT_IN_MCP_SERVERS: MCPServerConfig[] = [
    {
        slug: 'brave-search',
        name: 'Brave Search',
        serverUrl: process.env.BRAVE_MCP_SERVER_URL || '', // Empty means use direct API
    },
];

/**
 * Connect to an MCP server and retrieve its tools
 */
export async function connectToMCPServer(config: MCPServerConfig): Promise<{
    tools: Record<string, Tool>;
    close: () => Promise<void>;
} | null> {
    if (!config.serverUrl) {
        console.log(`[MCP] No server URL for ${config.name}, skipping MCP connection`);
        return null;
    }

    try {
        console.log(`[MCP] Connecting to ${config.name} at ${config.serverUrl}`);

        const client = await createMCPClient({
            transport: {
                type: 'http',
                url: config.serverUrl,
                headers: config.apiKey
                    ? { Authorization: `Bearer ${config.apiKey}` }
                    : undefined,
            },
        });

        const tools = await client.tools();
        console.log(`[MCP] Connected to ${config.name}, found ${Object.keys(tools).length} tools`);

        return {
            tools: tools as Record<string, Tool>,
            close: async () => {
                try {
                    await client.close();
                } catch (e) {
                    console.error(`[MCP] Error closing connection to ${config.name}:`, e);
                }
            },
        };
    } catch (error) {
        console.error(`[MCP] Failed to connect to ${config.name}:`, error);
        return null;
    }
}

/**
 * Get MCP tools from all configured and enabled servers
 * 
 * @param enabledServerSlugs - Array of server slugs that are enabled for this user
 * @returns Object containing all discovered tools and a cleanup function
 */
export async function getMCPTools(enabledServerSlugs: string[]): Promise<{
    tools: Record<string, Tool>;
    cleanup: () => Promise<void>;
}> {
    const allTools: Record<string, Tool> = {};
    const cleanupFunctions: (() => Promise<void>)[] = [];

    for (const server of BUILT_IN_MCP_SERVERS) {
        if (!enabledServerSlugs.includes(server.slug)) {
            continue;
        }

        const connection = await connectToMCPServer({
            ...server,
            apiKey: server.slug === 'brave-search' ? process.env.BRAVE_API_KEY : undefined,
        });

        if (connection) {
            Object.assign(allTools, connection.tools);
            cleanupFunctions.push(connection.close);
        }
    }

    return {
        tools: allTools,
        cleanup: async () => {
            await Promise.all(cleanupFunctions.map(fn => fn()));
        },
    };
}

/**
 * Available MCP servers for the settings UI
 */
export interface MCPServerInfo {
    slug: string;
    name: string;
    description: string;
    requiresApiKey: string | null;
    isAvailable: boolean;
}

export function getAvailableMCPServers(): MCPServerInfo[] {
    return [
        {
            slug: 'brave-search',
            name: 'Brave Search',
            description: 'Web search, news, images, and videos via Brave Search API',
            requiresApiKey: 'BRAVE_API_KEY',
            isAvailable: !!process.env.BRAVE_API_KEY,
        },
        // Future MCP servers can be added here
    ];
}
