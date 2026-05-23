<div align="center">
  <img src="./app/icon-template.svg" width="84" alt="Cracker mark" />
  <h1>Cracker</h1>
  <p><strong>A private AI chat app with a sharp, dark interface and support for Codex-style account usage.</strong></p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="React" src="https://img.shields.io/badge/React-19-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="AI SDK" src="https://img.shields.io/badge/AI%20SDK-v5-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
  </p>
  <img src="./cracker.gif" alt="Cracker app preview" width="900" />
</div>

## What is Cracker?

Cracker is a private AI chat app built around an OpenAI-compatible backend. It has encrypted chat storage, local auth, model switching, file attachments, web tools, learning mode, memory, and a matching mobile app.

You can also connect OpenAI accounts in the browser and use their Codex/ChatGPT-plan usage for compatible models. Add more than one account if you want. Cracker checks usage, picks the account with the most room left, and tries the next account when one hits a limit.

## Features

- OpenAI-compatible `/v1/chat/completions` backend support.
- Connect OpenAI accounts from the browser to use Codex/ChatGPT-plan usage where supported.
- Multiple OpenAI accounts. Cracker sorts them by remaining usage and rotates when one is rate-limited.
- GPT model presets: `gpt-5.5`, `gpt-5.4-mini`, and `gpt-5.3-codex-spark`.
- Model capability checks, so text-only models do not accept image uploads.
- Optional priority service mode for models that support it.
- PostgreSQL + Drizzle ORM for chats, settings, users, memory, and encrypted messages.
- Built-in email/password auth stored in PostgreSQL.
- Admin dashboard for managing invitation codes and access.
- Invitation-code signup flow, so the app can stay private.
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
> `OPENAI_BASE_URL` should point to the `/v1` root of your API server.

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

## Admin and invites

Cracker has an admin dashboard for controlling access. Admin users can create invitation codes, disable codes, and keep signups private instead of leaving registration open to everyone.

Guest mode is also available when you want quick access without creating a full account.

## OpenAI account usage

OpenAI account tokens are stored in browser `localStorage`, not in the database. The server only receives them when it needs to refresh usage or make a request.

You can connect several accounts. Cracker keeps a small usage snapshot for each one, uses the account with the most usage left, and rotates to another connected account on limit-style failures. If every account is out of room, the app shows a normal explanation instead of a raw Next.js or SDK error.

This is separate from `OPENAI_BASE_URL` / `OPENAI_API_KEY`. Those still work as the server-side fallback or proxy path.

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
