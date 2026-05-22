<div align="center">

# Cracker

A private AI chat app with encrypted chats, OpenAI-compatible models, account usage routing, tools, memory, and mobile support.

<br />

<img src="https://img.shields.io/badge/Self--hostable-1f2937?style=for-the-badge&labelColor=0d1117" />
<img src="https://img.shields.io/badge/OpenAI_accounts-f97316?style=for-the-badge&labelColor=0d1117" />
<img src="https://img.shields.io/badge/Encrypted_chats-1f2937?style=for-the-badge&labelColor=0d1117" />
<img src="https://img.shields.io/badge/Web_%2B_Mobile-f97316?style=for-the-badge&labelColor=0d1117" />

<br />
<br />

<img src="cracker.gif" alt="Cracker preview" width="100%" />

</div>

---

## What is Cracker?

Cracker is a private AI chat workspace built around an OpenAI-compatible backend.

It combines a ChatGPT-style interface with encrypted chat storage, local accounts, model switching, file attachments, learning modes, memory, web tools, admin-controlled access, and a matching mobile app.

---

## Core features

| Area | What Cracker has | Why it matters |
|---|---|---|
| **AI chat** | Streaming responses, model presets, reasoning effort, priority mode | Feels like a real chat product, not a basic API wrapper |
| **OpenAI accounts** | Browser-connected OpenAI accounts, usage snapshots, account rotation | Can use available account capacity before falling back |
| **Self-hosted backend** | OpenAI-compatible `/v1/chat/completions` support | Works with custom proxies or self-hosted model servers |
| **Encrypted chats** | Encrypted titles and message content | Chat history is not stored as plain text |
| **Files & images** | Attachments, pasted images, previews, upload handling | Useful for real work, not only text prompts |
| **Learning mode** | Summary, flashcards, teaching-style answers | Makes the app useful for studying and revision |
| **Tools** | Brave Search, YouTube tools, MCP server settings | Gives the assistant external context when needed |
| **Memory** | Stored user facts, profile settings, custom instructions | Makes responses more personalized across chats |
| **Admin access** | Invitation codes, user list, admin controls | Keeps the app private instead of open to everyone |
| **Mobile app** | Separate Expo app in `cracker-mobile/` | Same product idea beyond desktop web |

---

## Feature matrix

| Feature | Status |
|---|---|
| Streaming chat responses | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Chat history | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Encrypted messages | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Model switching | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Image-capability checks | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| File attachments | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Syntax-highlighted code blocks | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Markdown and math rendering | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Learning modes | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Web search tools | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Memory system | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Admin dashboard | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Invitation-code signup | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Guest mode | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |
| Mobile app | <img src="https://img.shields.io/badge/available-f97316?style=flat-square&labelColor=1f2937" /> |

---

## Models

| Model | Role | Images | Priority |
|---|---|---:|---:|
| `gpt-5.5` | Expert | Yes | Yes |
| `gpt-5.4-mini` | Balanced | Yes | No |
| `gpt-5.3-codex-spark` | Ultra fast | No | No |

Cracker keeps model capability rules in code, so text-only models do not receive image uploads.

---

## OpenAI account routing

| Capability | Description |
|---|---|
| Multiple accounts | Connect more than one OpenAI account in the browser |
| Usage tracking | Cracker keeps small usage snapshots for connected accounts |
| Smart selection | The app tries to use the account with the most available room |
| Limit fallback | If one account hits a limit, Cracker can try another |
| Server fallback | `OPENAI_BASE_URL` and `OPENAI_API_KEY` still work as the backend path |

OpenAI account tokens are stored in browser `localStorage`, not in the database.

---

## Access control

| Feature | Description |
|---|---|
| Local auth | Email/password accounts stored in PostgreSQL |
| Private signup | Invitation-code based registration |
| Admin dashboard | Manage users and invitation codes |
| Guest mode | Quick access without a full account |
| Admin protection | Prevents accidentally removing your own admin status |

---

## Tech stack

| Part | Tech |
|---|---|
| Web | Next.js, React, Tailwind CSS |
| Runtime | Bun |
| AI | Vercel AI SDK, OpenAI-compatible API |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Custom session auth |
| Mobile | Expo / React Native |
| Rendering | Markdown, math, syntax-highlighted code |

---

## Project layout

| Path | Purpose |
|---|---|
| `app/` | Next.js app, pages, API routes |
| `app/components/` | Chat UI, settings, sidebar, message rendering |
| `app/api/chat/` | Main streaming chat endpoint |
| `db/` | Drizzle schema and database connection |
| `lib/` | AI provider, auth, encryption, tools, model logic |
| `components/ui/` | Shared UI primitives |
| `scripts/` | Admin and maintenance scripts |
| `cracker-mobile/` | Expo mobile app |

---

## Requirements

| Requirement | Needed for |
|---|---|
| Bun | Installing and running the app |
| Node.js 20+ | Runtime compatibility |
| PostgreSQL | Persistent users, chats, settings, memory |
| OpenAI-compatible API server | AI model backend |

---

## Environment

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://user:password@host:5432/cracker

OPENAI_BASE_URL=http://your-api-host:8080/v1
OPENAI_API_KEY=your_proxy_key

AUTH_SESSION_SECRET=replace_with_a_long_random_secret
ENCRYPTION_KEK=replace_with_64_hex_chars

BRAVE_API_KEY=
YOUTUBE_API_KEY=