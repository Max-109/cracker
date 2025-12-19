<div align="center">

<img src="app/icon-template.svg" width="80" alt="Cracker" />

# Cracker

**The Living Interface**

An independent, premium AI chat experience.

[![Live](https://img.shields.io/badge/▶_LIVE-cracker.mom-af8787?style=for-the-badge)](https://cracker.mom)

---

<sub>Multi-model &nbsp;•&nbsp; Deep Reasoning &nbsp;•&nbsp; Real-time Streaming &nbsp;•&nbsp; Tool Calling</sub>

</div>

<br>

## What is Cracker?

Cracker is a next-generation AI interface built from scratch. Not a ChatGPT wrapper. Not a clone. A completely custom experience with its own design language, reasoning visualization, and tool ecosystem.

**→** Watch the AI think with real-time "Cracking" visualization  
**→** Powered by Gemini 3.0 Pro and 2.5 Flash  
**→** Web search, YouTube, and extensible tool calling via MCP  
**→** Full multimodal input: PDFs, images, code files  
**→** Learning mode that adapts to your preferences  
**→** Sharp-edge glassmorphism UI with customizable accent colors

<br>

## Stack

| | Technology |
|:--|:--|
| **Runtime** | Bun |
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **AI** | Vercel AI SDK + Google Generative AI |
| **Database** | PostgreSQL (Neon) + Drizzle ORM |
| **Auth** | Supabase |

<br>

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/cracker.git && cd cracker

# Install (bun only, never npm)
bun install

# Configure
cp .env.example .env
# Add: DATABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY

# Run
bun dev
```

<br>

## Environment

```env
# Required
DATABASE_URL=postgresql://...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Optional (tools)
BRAVE_API_KEY=...
YOUTUBE_API_KEY=...
```

<br>

## Mobile

Android APK via Capacitor:

```bash
npx cap sync android
cd android && ./gradlew assembleRelease
```

<br>

---

<div align="center">

<sub>Built with obsession by **Max**</sub>

</div>
