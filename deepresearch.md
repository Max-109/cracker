# Deep Research Mode

## Overview
Deep Research mode performs exhaustive web research using Tavily API and Gemini 2.0 Flash to produce comprehensive reports with citations.

## Flow

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│ PHASE 1: Generate Search Queries │
│ - AI generates 15-20 diverse     │
│   queries covering ALL angles    │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ PHASE 2: Execute Searches        │
│ - Batch searches (3 parallel)    │
│ - 10 results per search          │
│ - Tavily API (advanced depth)    │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ PHASE 3: Deep Dive               │
│ - AI analyzes initial findings   │
│ - Generates 10-15 follow-up      │
│   queries for gaps               │
│ - Execute additional searches    │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ FINAL: Generate Report           │
│ - Synthesize all sources         │
│ - Exhaustive coverage            │
│ - Citations [1], [2], [3]...     │
│ - Stream to frontend             │
│ - Save to database               │
└─────────────────────────────────┘
```

## Target
- 100+ sources from multiple search phases
- Covers: comparisons, specs, reviews, news, prices, issues, alternatives

## Files
- `/app/api/deep-search/route.ts` - Main API endpoint
- `/app/components/ModeSelector.tsx` - Mode selection UI
- `/app/components/MessageItem.tsx` - Research indicator display

## Database
- `chats.mode` - Stores 'chat' | 'learning' | 'deep-search'
- Chat history shows different icons based on mode

## Environment
- `TAVILY_API_KEY` - Required for web search
