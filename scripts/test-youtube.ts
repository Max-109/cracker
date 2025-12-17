/**
 * Test script for YouTube Data API integration
 * 
 * Tests:
 * 1. YouTube search API
 * 2. YouTube video details API
 * 
 * Usage: YOUTUBE_API_KEY=your_key bun run scripts/test-youtube.ts
 */

const YOUTUBE_API_KEY_ENV = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY_ENV) {
    console.error('❌ YOUTUBE_API_KEY environment variable is required');
    console.error('   Usage: YOUTUBE_API_KEY=your_key bun run scripts/test-youtube.ts');
    process.exit(1);
}
const YOUTUBE_API_KEY: string = YOUTUBE_API_KEY_ENV;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Test video ID from user request
const TEST_VIDEO_ID = 'krWFchiDWHs';

interface YouTubeSearchItem {
    id: { videoId: string };
    snippet: {
        title: string;
        description: string;
        channelTitle: string;
        channelId: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
    };
}

interface YouTubeVideoItem {
    id: string;
    snippet: {
        title: string;
        description: string;
        channelTitle: string;
        channelId: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
    };
    statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
    };
    contentDetails?: {
        duration?: string;
    };
}

async function testYouTubeSearch() {
    console.log('\n🔍 Testing YouTube Search API...');
    console.log('━'.repeat(50));

    const query = 'TypeScript tutorial';
    const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: '5',
        key: YOUTUBE_API_KEY,
    });

    try {
        const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            return false;
        }

        const data = await response.json();
        const items = data.items as YouTubeSearchItem[];

        console.log(`✅ Found ${items.length} videos for query: "${query}"\n`);

        items.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.snippet.title}`);
            console.log(`   Channel: ${item.snippet.channelTitle}`);
            console.log(`   Video ID: ${item.id.videoId}`);
            console.log(`   URL: https://youtube.com/watch?v=${item.id.videoId}`);
            console.log('');
        });

        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
}

async function testYouTubeVideoDetails() {
    console.log('\n📺 Testing YouTube Video Details API...');
    console.log('━'.repeat(50));
    console.log(`Testing with video ID: ${TEST_VIDEO_ID}`);
    console.log(`URL: https://youtube.com/watch?v=${TEST_VIDEO_ID}\n`);

    const params = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: TEST_VIDEO_ID,
        key: YOUTUBE_API_KEY,
    });

    try {
        const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            return false;
        }

        const data = await response.json();
        const items = data.items as YouTubeVideoItem[];

        if (items.length === 0) {
            console.error('❌ Video not found');
            return false;
        }

        const video = items[0];

        console.log('✅ Video Details:');
        console.log(`   Title: ${video.snippet.title}`);
        console.log(`   Channel: ${video.snippet.channelTitle}`);
        console.log(`   Published: ${video.snippet.publishedAt}`);
        console.log(`   Duration: ${video.contentDetails?.duration || 'N/A'}`);
        console.log(`   Views: ${formatNumber(video.statistics?.viewCount)}`);
        console.log(`   Likes: ${formatNumber(video.statistics?.likeCount)}`);
        console.log(`   Comments: ${formatNumber(video.statistics?.commentCount)}`);
        console.log(`   Thumbnail: ${video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url}`);
        console.log(`\n   Description (first 200 chars):`);
        console.log(`   ${video.snippet.description.slice(0, 200)}...`);

        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
}

async function testYouTubeTranscript() {
    console.log('\n📝 Testing YouTube Transcript API...');
    console.log('━'.repeat(50));
    console.log(`Testing with video ID: ${TEST_VIDEO_ID}`);
    console.log(`URL: https://youtube.com/watch?v=${TEST_VIDEO_ID}\n`);

    try {
        // Use youtubei.js for transcripts
        const { Innertube } = await import('youtubei.js');

        const youtube = await Innertube.create({
            lang: 'en',
            location: 'US',
            retrieve_player: false,
        });

        const info = await youtube.getInfo(TEST_VIDEO_ID);
        const transcriptInfo = await info.getTranscript();

        if (!transcriptInfo?.transcript?.content?.body?.initial_segments) {
            console.log('⚠️ No transcript available for this video');
            return false;
        }

        const segments = transcriptInfo.transcript.content.body.initial_segments;
        const fullText = segments.map((s: { snippet?: { text?: string } }) => s.snippet?.text || '').join(' ');

        console.log('✅ Transcript fetched successfully!');
        console.log(`   Segments: ${segments.length}`);
        console.log(`   Total characters: ${fullText.length}`);
        console.log(`\n   First 300 chars of transcript:`);
        console.log(`   ${fullText.slice(0, 300)}...`);

        return true;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching transcript:', errorMessage);
        return false;
    }
}

function formatNumber(num: string | undefined): string {
    if (!num) return 'N/A';
    const n = parseInt(num, 10);
    if (isNaN(n)) return num;
    return n.toLocaleString();
}

async function main() {
    console.log('🎬 YouTube Data API Test Script');
    console.log('='.repeat(50));
    console.log(`API Key: ${YOUTUBE_API_KEY.slice(0, 10)}...${YOUTUBE_API_KEY.slice(-4)}`);

    const searchOk = await testYouTubeSearch();
    const detailsOk = await testYouTubeVideoDetails();
    const transcriptOk = await testYouTubeTranscript();

    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results:');
    console.log(`   Search API: ${searchOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Video Details API: ${detailsOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Transcript API: ${transcriptOk ? '✅ PASS' : '⚠️ NO CAPTIONS'}`);
    console.log('='.repeat(50));

    process.exit(searchOk && detailsOk ? 0 : 1);
}

main();
