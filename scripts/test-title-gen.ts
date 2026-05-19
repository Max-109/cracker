/**
 * Test: Title Generation API
 * 
 * Verifies that chat titles are properly generated via the API.
 * Run with: npx tsx scripts/test-title-gen.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_COOKIE = process.env.TEST_COOKIE || '';

interface TestResult {
    passed: boolean;
    message: string;
}

async function testTitleGeneration(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (TEST_COOKIE) {
        headers['Cookie'] = TEST_COOKIE;
    }

    let chatId: string | null = null;

    try {
        // Test 1: Create a new chat
        console.log('📝 Test 1: Creating new chat...');
        const createRes = await fetch(`${API_BASE}/api/chats`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ title: null, mode: 'chat' }),
        });

        if (!createRes.ok) {
            results.push({ passed: false, message: `POST /api/chats failed` });
            return results;
        }

        const chat = await createRes.json();
        chatId = chat.id;
        console.log(`   Created chat: ${chatId}`);
        results.push({ passed: true, message: `Created chat ${chatId}` });

        // Test 2: Generate a title
        console.log('📝 Test 2: Generating title...');
        const titleRes = await fetch(`${API_BASE}/api/generate-title`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                chatId,
                prompt: 'How do I make homemade pasta from scratch?'
            }),
        });

        if (!titleRes.ok) {
            const err = await titleRes.json();
            results.push({ passed: false, message: `POST /api/generate-title failed: ${JSON.stringify(err)}` });
        } else {
            const titleData = await titleRes.json();
            console.log(`   Generated title: "${titleData.title}"`);

            if (titleData.title && titleData.title.length > 0) {
                results.push({ passed: true, message: `Title generated: "${titleData.title}"` });
            } else {
                results.push({ passed: false, message: 'Title is empty' });
            }
        }

        // Test 3: Verify title was saved to chat
        console.log('📝 Test 3: Verifying title saved to chat...');
        const chatRes = await fetch(`${API_BASE}/api/chats`, { headers });
        const chats = await chatRes.json();

        const updatedChat = chats.find((c: { id: string }) => c.id === chatId);
        if (updatedChat && updatedChat.title) {
            console.log(`   Chat title in DB: "${updatedChat.title}"`);
            results.push({ passed: true, message: `Title persisted in DB: "${updatedChat.title}"` });
        } else {
            results.push({ passed: false, message: 'Title not found in chat record' });
        }

        // Cleanup: Delete the test chat
        console.log('📝 Cleanup: Deleting test chat...');
        await fetch(`${API_BASE}/api/chats/${chatId}`, {
            method: 'DELETE',
            headers,
        });
        results.push({ passed: true, message: 'Test chat cleaned up' });

    } catch (error) {
        results.push({ passed: false, message: `Error: ${error}` });

        // Attempt cleanup
        if (chatId) {
            try {
                await fetch(`${API_BASE}/api/chats/${chatId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...(TEST_COOKIE ? { Cookie: TEST_COOKIE } : {}) },
                });
            } catch { }
        }
    }

    return results;
}

async function main() {
    console.log('🧪 Testing Title Generation\n');
    console.log(`   API Base: ${API_BASE}`);
    console.log(`   Auth: ${TEST_COOKIE ? 'Cookie provided' : 'No cookie (may fail)'}\n`);

    const results = await testTitleGeneration();

    console.log('\n📊 Results:\n');
    let passed = 0;
    let failed = 0;

    for (const r of results) {
        if (r.passed) {
            console.log(`   ✅ ${r.message}`);
            passed++;
        } else {
            console.log(`   ❌ ${r.message}`);
            failed++;
        }
    }

    console.log(`\n   Total: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main();
