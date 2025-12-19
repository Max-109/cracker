<p align="center">
  <img src="app/icon-template.svg" width="100" alt="Cracker Logo" />
</p>

# Cracker

<p align="center">
  <strong>The Ultimate AI Chat Experience</strong>
</p>

<p align="center">
  <a href="https://cracker.mom">
    <img src="https://img.shields.io/badge/LIVE-cracker.mom-000000?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Framework-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Model-Gemini_3.0_Pro-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white" />
  <img src="https://img.shields.io/badge/Design-Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

<p align="center">
  <em>Multi-model • Deep Reasoning • Real-time Streaming • Living Interface</em>
</p>

---

## ✨ Features

- **🚀 Latest Models**: Powered by **Gemini 3.0 Pro** and **2.5 Flash** for cutting-edge performance.
- **🧠 Reasoning Effort**: Adjustable **Low**, **Medium**, and **High** thinking modes for complex problem solving.
- **🎓 Learning Mode**: Adaptive AI that learns from your conversations and remembers preferences.
- **🔌 MCP Integration**: Extensible **Model Context Protocol** support to connect with external tools.
- **📎 Smart Attachments**: Full multimodal understanding for **PDFs**, **Images**, and **Text** files.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Runtime** | Bun |
| **Styling** | Tailwind CSS v4 |
| **AI SDK** | Vercel AI SDK Core |
| **Model Provider** | Google Generative AI (Gemini API) |
| **Database** | PostgreSQL (Neon) + Drizzle ORM |
| **State** | React Context + URL State |

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- PostgreSQL Database
- Google AI API Key

### Installation

```bash
# 1. Clone
git clone <repo-url>
cd testchatgpt

# 2. Install
bun install

# 3. Setup Env
cp .env.example .env
```

### Environment Setup

Add your keys to `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Google Gemini API (Required)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Optional: Search Tools
TAVILY_API_KEY=...
BRAVE_API_KEY=...
```

### Run

```bash
# Start development server
bun dev

# Run database migrations
bun run db:push
```

## 🏗️ Architecture

```mermaid
graph TD
    User[User] -->|Chat| UI[Next.js UI]
    UI -->|Stream| API[API Interface]
    API -->|Prompt| SDK[Vercel AI SDK]
    SDK -->|Generate| Gemini[Gemini API]
    
    subgraph Tools
    Gemini -->|Call| MCP[MCP Client]
    MCP -->|Search| Brave[Brave API]
    end
    
    subgraph Data
    UI -->|Persist| DB[(PostgreSQL)]
    end
```

## 📱 Mobile App (Android)

This project includes a capacitor configuration for Android.

```bash
# Build Android APK
bun run build
npx cap sync android
npx cap open android
```

---

<p align="center">
  <sub>Built with ❤️ by Max</sub>
</p>
