<div align="center">
  <img src="./app/icon-template.svg" width="84" alt="Cracker mark" />
  <h1>Cracker</h1>
  <p><strong>Private AI chat with encrypted history, web tools, and a matching Expo Android app.</strong></p>
  <img src="./cracker.gif" alt="Cracker app preview" width="900" />
</div>

## What is Cracker?

Cracker is a dark, sharp-edged AI chat app with a Next.js web client and an Expo React Native mobile client. It stores users, chats, settings, memory, and encrypted messages in PostgreSQL. The current backend is OpenAI-compatible, with browser-connected OpenAI account support on web and a server-side API-key fallback.

## Features

- Streaming chat with reasoning parts, tool events, markdown, code blocks, and tokens/sec stats.
- File and image attachments through the web UI and mobile upload flow.
- Model presets: `gpt-5.5` Expert, `gpt-5.4-mini` Balanced, and `gpt-5.3-codex-spark` Ultra Fast.
- Adaptive reasoning: prompts are classified as `low`, `medium`, `high`, or `xhigh`.
- Chat, deep-search, and learning workflows; learning has summary, flashcard, and teaching submodes.
- Settings for model, reasoning, response length, custom instructions, tools, memory, profile, and accent color.
- Email/password auth, guest auth, admin-created invitation codes, and JWT-backed mobile sessions.
- Per-chat encrypted message storage with an `ENCRYPTION_KEK`-wrapped data key.
- Optional tools for Brave Search, YouTube, and Tavily-backed deep search.
- Expo SDK 54 / React Native Android app in `cracker-mobile/`, targeting `https://cracker.mom` by default.

## Tech stack

| Part | Tech |
| --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS v4 |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router |
| Runtime | Bun |
| AI | Vercel AI SDK, OpenAI-compatible provider |
| Data | PostgreSQL, Drizzle ORM |
| Auth | JWT cookies / bearer tokens, PostgreSQL users |

## Requirements

- Bun
- PostgreSQL
- OpenAI-compatible API key or proxy key
- Java 17 and Android SDK command-line tools for Android builds

## Environment

Create `.env` in the repo root:

```env
DATABASE_URL=postgresql://user:password@host:5432/cracker
OPENAI_BASE_URL=http://your-api-host:8080/v1
OPENAI_API_KEY=your_proxy_key
AUTH_SESSION_SECRET=replace_with_a_long_random_secret
ENCRYPTION_KEK=64_hex_characters

# Optional
BRAVE_API_KEY=
YOUTUBE_API_KEY=
TAVILY_API_KEY=
```

`DATABASE_URL` may also be `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL_NON_POOLING`. `PROXY_API_KEY` is accepted instead of `OPENAI_API_KEY`.

## Run the web app

```bash
bun install
bunx drizzle-kit push
bun run dev
```

Open `http://localhost:3000`.

## Create an admin user

```bash
ADMIN_PASSWORD="your-password" bun run scripts/create-admin.ts admin@example.com "Admin"
```

The script creates or updates the user as admin and prints an invitation code.

## Run the mobile app

```bash
cd cracker-mobile
bun install
bun start -- --clear
```

Use a native build or dev client. The app includes MMKV, Reanimated, dynamic app icons, Secure Store, and Nitro modules, so plain Expo Go is not the reliable target.

## Build the Android APK

```bash
cd cracker-mobile
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools

bun install
bunx tsc --noEmit
cd android
./gradlew assembleRelease
cd ../..
cp cracker-mobile/android/app/build/outputs/apk/release/app-release.apk cracker.apk
```

The latest local build output is `cracker.apk` in the repo root.

## Clean Android rebuild after Expo/native changes

```bash
cd cracker-mobile
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools

bunx expo prebuild --clean --platform android
./scripts/copy-foreground-icons.sh
printf '\norg.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home\nreactNativeArchitectures=arm64-v8a\n' >> android/gradle.properties
echo 'sdk.dir=/opt/homebrew/share/android-commandlinetools' > android/local.properties
cd android && ./gradlew assembleRelease
```

## Project layout

```txt
app/                    Next.js routes, API routes, and web components
db/                     Drizzle schema and database connection
lib/                    AI provider, auth, encryption, uploads, tools
scripts/create-admin.ts Admin bootstrap script
cracker-mobile/         Expo mobile app
cracker-mobile/android/ Native Android project used for APK builds
```

## Notes

- Mobile voice transcription is hidden until mobile has OpenAI account auth; the backend transcription route requires `openAIAccountAuth`.
- `expo-doctor` reports the Metro override in `cracker-mobile/metro.config.js`; it is intentional to avoid the parent Next.js app's React copy.
- Root `android/` is a Capacitor wrapper. Use `cracker-mobile/android/` for the Expo Android APK above.
