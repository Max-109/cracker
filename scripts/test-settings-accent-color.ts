/**
 * Test: Settings Accent Color Persistence
 * 
 * Verifies that accent color is properly saved to and loaded from the database.
 * Run with: npx tsx scripts/test-settings-accent-color.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_COOKIE = process.env.TEST_COOKIE || ''; // Pass authentication cookie

interface TestResult {
    passed: boolean;
    message: string;
}

async function testAccentColorPersistence(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (TEST_COOKIE) {
        headers['Cookie'] = TEST_COOKIE;
    }

    try {
        // Test 1: Get current settings
        console.log('📝 Test 1: Fetching current settings...');
        const getRes1 = await fetch(`${API_BASE}/api/settings`, { headers });
        const settings1 = await getRes1.json();

        if (!getRes1.ok) {
            results.push({ passed: false, message: `GET /api/settings failed: ${JSON.stringify(settings1)}` });
            return results;
        }

        const originalColor = settings1.accentColor || '#af8787';
        console.log(`   Current accent color: ${originalColor}`);
        results.push({ passed: true, message: `Fetched settings, current color: ${originalColor}` });

        // Test 2: Update accent color to red
        console.log('📝 Test 2: Setting accent color to #ff0000...');
        const putRes1 = await fetch(`${API_BASE}/api/settings`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ accentColor: '#ff0000' }),
        });

        if (!putRes1.ok) {
            const err = await putRes1.json();
            results.push({ passed: false, message: `PUT /api/settings failed: ${JSON.stringify(err)}` });
            return results;
        }
        results.push({ passed: true, message: 'PUT accepted #ff0000' });

        // Test 3: Verify the color was saved
        console.log('📝 Test 3: Verifying accent color saved...');
        const getRes2 = await fetch(`${API_BASE}/api/settings`, { headers });
        const settings2 = await getRes2.json();

        if (settings2.accentColor === '#ff0000') {
            results.push({ passed: true, message: 'Verified: accentColor is #ff0000' });
        } else {
            results.push({ passed: false, message: `Expected #ff0000, got ${settings2.accentColor}` });
        }

        // Test 4: Update to green
        console.log('📝 Test 4: Setting accent color to #00ff00...');
        await fetch(`${API_BASE}/api/settings`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ accentColor: '#00ff00' }),
        });

        const getRes3 = await fetch(`${API_BASE}/api/settings`, { headers });
        const settings3 = await getRes3.json();

        if (settings3.accentColor === '#00ff00') {
            results.push({ passed: true, message: 'Verified: accentColor is #00ff00' });
        } else {
            results.push({ passed: false, message: `Expected #00ff00, got ${settings3.accentColor}` });
        }

        // Test 5: Restore original color
        console.log('📝 Test 5: Restoring original color...');
        await fetch(`${API_BASE}/api/settings`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ accentColor: originalColor }),
        });
        results.push({ passed: true, message: `Restored original color: ${originalColor}` });

    } catch (error) {
        results.push({ passed: false, message: `Error: ${error}` });
    }

    return results;
}

async function main() {
    console.log('🧪 Testing Accent Color Persistence\n');
    console.log(`   API Base: ${API_BASE}`);
    console.log(`   Auth: ${TEST_COOKIE ? 'Cookie provided' : 'No cookie (may fail)'}\n`);

    const results = await testAccentColorPersistence();

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
