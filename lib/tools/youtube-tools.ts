/**
 * YouTube Data API Tools for AI SDK with Vertex AI
 * 
 * Uses YouTube Data API v3 for searching videos and getting video details.
 * Uses youtubei.js for fetching transcripts (more reliable than youtube-transcript).
 * FIX APPLIED: Use `inputSchema` with `zodSchema()` wrapper instead of `parameters`.
 */

import { z } from 'zod';
import { zodSchema } from 'ai';
import { Innertube } from 'youtubei.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Result types
export interface YouTubeVideoResult {
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnailUrl: string;
    viewCount?: string;
    likeCount?: string;
    duration?: string;
}

// Define Zod schemas
const videoSearchSchema = z.object({
    query: z.string().describe('Search query for YouTube videos'),
    maxResults: z.number().optional().describe('Number of results to return (default 10, max 50)'),
});

const videoDetailsSchema = z.object({
    videoIds: z.array(z.string()).describe('Array of YouTube video IDs'),
});

type VideoSearchParams = z.infer<typeof videoSearchSchema>;
type VideoDetailsParams = z.infer<typeof videoDetailsSchema>;

/**
 * YouTube Search Tool - Search for videos
 */
export const youtubeSearch = {
    description: 'Search YouTube for videos. Use this when you need to find videos about a topic, tutorial, entertainment, music, or any YouTube content.',
    inputSchema: zodSchema(videoSearchSchema),
    execute: async (args: VideoSearchParams) => {
        const { query, maxResults = 10 } = args;
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            console.error('[YouTube] No API key found');
            return { error: 'YouTube API key not configured.' };
        }

        try {
            console.log('[YouTube] Searching for:', query);

            const params = new URLSearchParams({
                part: 'snippet',
                q: query.slice(0, 100),
                type: 'video',
                maxResults: String(Math.min(Math.max(maxResults, 1), 50)),
                key: apiKey,
            });

            const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[YouTube] API error:', response.status, errorText);
                return { error: `YouTube API error: ${response.status}` };
            }

            const data = await response.json();

            const results: YouTubeVideoResult[] = (data.items || []).map((item: {
                id: { videoId: string };
                snippet: {
                    title: string;
                    description: string;
                    channelTitle: string;
                    channelId: string;
                    publishedAt: string;
                    thumbnails: { medium?: { url: string }; default?: { url: string } };
                };
            }) => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                publishedAt: item.snippet.publishedAt,
                thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
            }));

            console.log('[YouTube] Found', results.length, 'videos');

            // Get view counts for the videos
            if (results.length > 0) {
                const videoIds = results.map(r => r.videoId).join(',');
                const statsParams = new URLSearchParams({
                    part: 'statistics,contentDetails',
                    id: videoIds,
                    key: apiKey,
                });

                try {
                    const statsResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${statsParams}`);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        const statsMap = new Map<string, { viewCount?: string; likeCount?: string; duration?: string }>();

                        for (const item of statsData.items || []) {
                            statsMap.set(item.id, {
                                viewCount: item.statistics?.viewCount,
                                likeCount: item.statistics?.likeCount,
                                duration: item.contentDetails?.duration,
                            });
                        }

                        // Merge stats into results
                        for (const result of results) {
                            const stats = statsMap.get(result.videoId);
                            if (stats) {
                                result.viewCount = stats.viewCount;
                                result.likeCount = stats.likeCount;
                                result.duration = stats.duration;
                            }
                        }
                    }
                } catch (statsError) {
                    console.warn('[YouTube] Failed to fetch stats:', statsError);
                }
            }

            return {
                query,
                resultCount: results.length,
                results,
            };
        } catch (error) {
            console.error('[YouTube] Error:', error);
            return { error: `YouTube search failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    },
};

/**
 * YouTube Video Details Tool - Get detailed information about specific videos
 */
export const youtubeVideoDetails = {
    description: 'Get detailed information about specific YouTube videos by their IDs. Use this when you need view counts, likes, descriptions, or other metadata for videos.',
    inputSchema: zodSchema(videoDetailsSchema),
    execute: async (args: VideoDetailsParams) => {
        const { videoIds } = args;
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            console.error('[YouTube] No API key found');
            return { error: 'YouTube API key not configured.' };
        }

        if (!videoIds || videoIds.length === 0) {
            return { error: 'No video IDs provided' };
        }

        try {
            console.log('[YouTube] Getting details for:', videoIds.length, 'videos');

            const params = new URLSearchParams({
                part: 'snippet,statistics,contentDetails',
                id: videoIds.slice(0, 50).join(','),
                key: apiKey,
            });

            const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[YouTube] API error:', response.status, errorText);
                return { error: `YouTube API error: ${response.status}` };
            }

            const data = await response.json();

            const results: YouTubeVideoResult[] = (data.items || []).map((item: {
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
                };
                contentDetails?: {
                    duration?: string;
                };
            }) => ({
                videoId: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                publishedAt: item.snippet.publishedAt,
                thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
                viewCount: item.statistics?.viewCount,
                likeCount: item.statistics?.likeCount,
                duration: item.contentDetails?.duration,
            }));

            console.log('[YouTube] Got details for', results.length, 'videos');

            return {
                videoIds,
                resultCount: results.length,
                results,
            };
        } catch (error) {
            console.error('[YouTube] Error:', error);
            return { error: `YouTube details failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    },
};

/**
 * YouTube Transcript Tool - Get video captions/transcripts
 * Uses youtubei.js for more reliable transcript fetching
 */

const transcriptSchema = z.object({
    videoId: z.string().describe('YouTube video ID (e.g., "dQw4w9WgXcQ")'),
    lang: z.string().optional().describe('Language code for transcript (e.g., "en", "ru"). Default: auto-detect'),
});

type TranscriptParams = z.infer<typeof transcriptSchema>;

export const youtubeGetTranscript = {
    description: 'Get the transcript/captions of a YouTube video. Use this when users ask for the full text, subtitles, or transcription of a YouTube video. Extract the video ID from the URL first.',
    inputSchema: zodSchema(transcriptSchema),
    execute: async (args: TranscriptParams) => {
        const { videoId, lang } = args;

        try {
            console.log('[YouTube Transcript] Fetching transcript for:', videoId, lang ? `(lang: ${lang})` : '');

            // Create Innertube instance
            const youtube = await Innertube.create({
                lang: lang || 'en',
                location: 'US',
                retrieve_player: false,
            });

            // Get video info
            const info = await youtube.getInfo(videoId);

            // Get transcript
            const transcriptInfo = await info.getTranscript();

            if (!transcriptInfo || !transcriptInfo.transcript) {
                console.warn('[YouTube Transcript] No transcript found for video:', videoId);
                return {
                    error: 'No transcript available for this video. The video may not have captions enabled.',
                    videoId,
                };
            }

            // Extract transcript content
            const content = transcriptInfo.transcript.content;
            if (!content || !content.body || !content.body.initial_segments) {
                console.warn('[YouTube Transcript] Transcript content empty for video:', videoId);
                return {
                    error: 'Transcript structure not available for this video.',
                    videoId,
                };
            }

            const segments = content.body.initial_segments;

            // Extract text from segments
            interface TranscriptSegment {
                snippet?: { text?: string };
                start_ms?: string;
                end_ms?: string;
            }

            const textSegments = segments.map((seg: TranscriptSegment) => ({
                text: seg.snippet?.text || '',
                startMs: parseInt(seg.start_ms || '0', 10),
                endMs: parseInt(seg.end_ms || '0', 10),
            }));

            // Combine all text
            const fullTranscript = textSegments
                .map((s: { text: string }) => s.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            console.log('[YouTube Transcript] Got transcript:', textSegments.length, 'segments,', fullTranscript.length, 'chars');

            return {
                videoId,
                language: lang || 'auto',
                segmentCount: textSegments.length,
                charCount: fullTranscript.length,
                transcript: fullTranscript,
                segments: textSegments.slice(0, 50), // First 50 segments with timestamps
            };
        } catch (error) {
            console.error('[YouTube Transcript] Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check for common error cases
            if (errorMessage.includes('This video is unavailable')) {
                return {
                    error: 'Video is unavailable or private.',
                    videoId,
                };
            }
            if (errorMessage.includes('Sign in')) {
                return {
                    error: 'This video requires sign-in to access.',
                    videoId,
                };
            }

            return {
                error: `Failed to fetch transcript: ${errorMessage}`,
                videoId,
            };
        }
    },
};

// Export tools object
export const youtubeTools = {
    youtube_search: youtubeSearch,
    youtube_video_details: youtubeVideoDetails,
    youtube_get_transcript: youtubeGetTranscript,
};

/**
 * Get enabled YouTube tools based on user settings
 */
export function getEnabledYouTubeTools(enabledServers: string[]) {
    if (enabledServers.includes('youtube') && process.env.YOUTUBE_API_KEY) {
        return youtubeTools;
    }
    return {};
}
