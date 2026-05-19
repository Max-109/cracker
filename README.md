<div align="center">
  <h1>Cracker</h1>
  <p><strong>A sharp, dark AI chat interface for self-hosted OpenAI-compatible models.</strong></p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/frontend-Next.js%2016-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Runtime" src="https://img.shields.io/badge/runtime-Bun-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Database" src="https://img.shields.io/badge/database-PostgreSQL-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="API" src="https://img.shields.io/badge/API-OpenAI%20Compatible-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
  </p>
  <img src="./cracker.gif" alt="Cracker app preview" width="900" />
</div>

## What is Cracker?

Cracker is a private AI chat app built around a self-hosted OpenAI-compatible API. It has a square, cyberpunk-ish interface, encrypted chat storage, local account auth, model switching, image-capable chat, web tools, learning mode, and memory.

It is meant to feel fast and personal without depending on hosted auth or a managed AI provider.

## Features

- OpenAI-compatible `/v1/chat/completions` backend support.
- GPT model presets: `gpt-5.5`, `gpt-5.4-mini`, and `gpt-5.3-codex-spark`.
- Model capability checks, so text-only models do not accept image uploads.
- Optional priority service mode for models that support it.
- PostgreSQL + Drizzle ORM for chats, settings, users, memory, and encrypted messages.
- Built-in email/password auth stored in PostgreSQL.
- Guest mode.
- File and image attachments for supported models.
- Brave Search and YouTube tools.
- Learning mode for summaries, flashcards, and teaching-style answers.
- Matching Expo mobile app in `cracker-mobile/`.

## Tech stack

| Part | Tech |
| --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS v4 |
| Runtime | Bun |
| AI | Vercel AI SDK, OpenAI-compatible API |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Custom JWT cookies + PostgreSQL users |
| Mobile | Expo / React Native |

## Requirements

- Bun
- Node.js 20+
- PostgreSQL
- An OpenAI-compatible API server

## Environment

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://user:password@host:5432/cracker
OPENAI_BASE_URL=http://your-api-host:8080/v1
OPENAI_API_KEY=your_proxy_key
AUTH_SESSION_SECRET=replace_with_a_long_random_secret
ENCRYPTION_KEK=replace_with_64_hex_chars

# Optional tools
BRAVE_API_KEY=
YOUTUBE_API_KEY=
```

> [!NOTE]
> `OPENAI_BASE_URL` should point to the `/v1` root of your API server. For example: `http://130.61.143.0:8080/v1`.

## Run locally

```bash
bun install
bunx drizzle-kit push
bun run dev
```

Open:

```txt
http://localhost:3000
```

## Create an admin user

```bash
ADMIN_PASSWORD="your-password" bun run scripts/create-admin.ts admin@example.com "Admin"
```

The script creates the user, marks it as admin, and prints an invitation code.

## Mobile app

```bash
cd cracker-mobile
bun install
bun start
```

The mobile app uses the same backend API and database-backed auth.

## Model behavior

Cracker keeps model capability rules in `lib/model-capabilities.ts`.

Current defaults:

| Model | Images | Priority mode |
| --- | --- | --- |
| `gpt-5.5` | yes | yes |
| `gpt-5.4-mini` | yes | no |
| `gpt-5.3-codex-spark` | no | no |

Reasoning effort is adaptive. Before a chat request, Cracker asks `gpt-5.3-codex-spark` to classify the prompt as `low`, `medium`, `high`, or `xhigh`, then sends that value with the actual chat request.

## Project layout

```txt
app/                  Next.js app and API routes
app/components/       Chat UI, settings, sidebar, message rendering
app/api/chat/         Main streaming chat endpoint
db/                   Drizzle schema and database connection
lib/                  AI provider, auth, encryption, tools
scripts/              Admin and maintenance scripts
cracker-mobile/       Expo mobile app
```

## Deployment notes

- Use PostgreSQL with persistent storage.
- Set `DATABASE_URL`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `AUTH_SESSION_SECRET`, and `ENCRYPTION_KEK` on the server.
- Run `bunx drizzle-kit push` after schema changes.
- Keep the API key server-side. Do not expose it with a `NEXT_PUBLIC_` prefix.
