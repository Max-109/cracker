#!/usr/bin/env npx ts-node
/**
 * Test script for Mobile API - validates the chat endpoint works
 * Run: npx ts-node scripts/test-mobile-chat.ts
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ChatRequest {
    chatId: string;
    messages: { role: string; content: string }[];
    model: string;
    reasoningEffort: string;
    chatMode: string;
    responseLength: number;
    userName: string;
    userGender: string;
    learningMode: boolean;
    learningSubMode: string;
    customInstructions: string;
    enabledMcpServers: string[];
}

async function testChatEndpoint() {
    console.log('🧪 Testing Mobile Chat Endpoint...\n');
    console.log(`API Base: ${API_BASE}`);

    // Test payload matching what mobile sends
    const testPayload: ChatRequest = {
        chatId: 'test-chat-' + Date.now(),
        messages: [
            { role: 'user', content: 'Hello, respond with just "Test successful"' }
        ],
        model: 'gemini-2.5-flash',
        reasoningEffort: 'medium',
        chatMode: 'cracking',
        responseLength: 30,
        userName: '',
        userGender: 'not-specified',
        learningMode: false,
        learningSubMode: 'teaching',
        customInstructions: '',
        enabledMcpServers: [],
    };

    console.log('\n📤 Request payload:');
    console.log(JSON.stringify(testPayload, null, 2));

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(testPayload),
        });

        console.log(`\n📥 Response status: ${response.status} ${response.statusText}`);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('\n❌ ERROR Response:', errorText);
            return;
        }

        if (!response.body) {
            console.error('❌ No response body');
            return;
        }

        console.log('\n📨 SSE Events:');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let eventCount = 0;
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        console.log('  ✅ [DONE]');
                        continue;
                    }
                    try {
                        const event = JSON.parse(data);
                        eventCount++;
                        console.log(`  ${eventCount}. ${event.type}:`,
                            event.type === 'text-delta' ? event.textDelta?.slice(0, 50) + '...' :
                                event.type === 'status' ? event.status :
                                    event.type === 'finish' ? event.finishReason :
                                        JSON.stringify(event).slice(0, 80)
                        );
                    } catch {
                        console.log('  (parse error):', data.slice(0, 80));
                    }
                }
            }
        }

        console.log(`\n✅ Test complete! Received ${eventCount} events.`);

    } catch (error) {
        console.error('\n❌ Fetch error:', error);
    }
}

// Run test
testChatEndpoint();
