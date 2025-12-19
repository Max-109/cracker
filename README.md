<div align="center">

# Cracker

[![Live Demo](https://img.shields.io/badge/LIVE-cracker.mom-af8787?style=flat-square)](https://cracker.mom)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini-3.0_Pro-8E75B2?style=flat-square&logo=google-gemini&logoColor=white)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

[Cracker](https://cracker.mom/) is an independent AI chat interface built from the ground up. Not a ChatGPT clone or wrapper — a fully custom experience with its own design language, reasoning visualization, and tool ecosystem.

<div align="center">

<!-- TODO: Add demo GIF here -->
<!-- ![Demo](/assets/demo.gif) -->

</div>

## Goals

- **Premium Experience**: A "living interface" with glassmorphism, micro-animations, and sharp-edge aesthetics.
- **Deep Reasoning**: Real-time visualization of AI thinking with collapsible "Cracking" display.
- **Multi-Model**: Seamless switching between Gemini 3.0 Pro, 2.5 Flash, and more.
- **Extensibility**: Tool calling via MCP (Model Context Protocol) — web search, YouTube, and custom tools.
- **Learning Mode**: AI that remembers your preferences and adapts over time.

> [!NOTE]
> Cracker is actively maintained and continuously evolving with new features.

## Features

- [x] Configuration & User Settings
- [x] Authentication (Supabase)
- Chat Interface
  - [x] Real-time Streaming
  - [x] Tokens Per Second Metrics
  - [x] Message Persistence
  - [x] Chat History Sidebar
- Reasoning & Thinking
  - [x] Collapsible Reasoning Display
  - [x] Thinking Effort Levels (Low/Medium/High)
  - [x] Auto Effort Classification
- Multimodal
  - [x] Image Attachments
  - [x] PDF Documents
  - [x] Code Files
  - [x] Drag & Drop Upload
  - [x] Clipboard Paste
- Tools (MCP)
  - [x] Web Search (Brave API)
  - [x] YouTube Search
  - [x] Tool Call Indicator UI
- Customization
  - [x] Dynamic Accent Colors
  - [x] Code Wrapping Toggle
  - [x] Auto-Scroll Settings
  - [x] Learning Mode
  - [x] Custom Instructions
- Mobile
  - [x] Responsive Design
  - [x] Safe Area Support
  - [x] Android APK (Capacitor)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Vercel AI SDK + Google Generative AI |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Auth | Supabase |

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/cracker.git
cd cracker

# Install (use bun, not npm)
bun install

# Configure
cp .env.example .env

# Run
bun dev
```

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Auth
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional (Tools)
BRAVE_API_KEY=...
YOUTUBE_API_KEY=...
```

## Mobile App

Build an Android APK using Capacitor:

```bash
npx cap sync android
cd android && ./gradlew assembleRelease
```

The app wraps the deployed website in a native WebView.

## Contributing

Contributions are welcome! Please read the codebase guidelines in `AGENTS.md`.

## Documentation

Technical documentation for AI agents and contributors: [`AGENTS.md`](AGENTS.md)

---

<div align="center">

Built by **Max**

</div>
