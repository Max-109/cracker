<div align="center">
  <img src="./app/icon-template.svg" width="84" alt="Cracker mark" />
  <h1>Cracker</h1>
  <p><strong>AI chat web and mobile app focused on UI/UX.</strong></p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="React" src="https://img.shields.io/badge/React-19-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="AI SDK" src="https://img.shields.io/badge/AI%20SDK-v5-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
  </p>
  <h3>Web version</h3>
  <img src="./cracker.gif" alt="Cracker app preview" width="900" />

  <h3>Android app</h3>
  <p>
    <img src="./docs/release/mobile-login.jpg" alt="Cracker mobile login" width="300" />
    <img src="./docs/release/syntax-highlighting-preview.png" alt="Cracker mobile syntax highlighting preview" width="300" />
  </p>
</div>

## What is Cracker?

Cracker is a private AI chat app built around an OpenAI-compatible backend. It has encrypted chat storage, local auth, model switching, file attachments, web tools, learning mode, memory, and a matching mobile app.

You can also connect OpenAI accounts in the browser and use their Codex/ChatGPT-plan usage for compatible models. Add more than one account if you want. Cracker checks usage, picks the account with the most room left, and tries the next account when one hits a limit.

## Features

- Browser-connected OpenAI accounts with usage-aware rotation for Codex/ChatGPT-plan usage.
- Model presets: Expert (GPT 5.5), Balanced (GPT 5.4 Mini), and Ultra Fast (GPT 5.3 Codex Spark).
- Fast mode support.
- PostgreSQL + Drizzle ORM for chats, settings, users, memory, encrypted messages, and email/password auth.
- Admin dashboard with invitation-code signup for private access.
- Guest mode.
- File and image attachments.
- Streaming chat with reasoning, tool events, and tokens/sec stats.
- Accent-color theming across the UI, favicon, app icon, and code highlighting.
- MCP tools for Brave Search and YouTube.
- Learning mode for summaries, flashcards, and guided explanations.
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
export PATH="$JAVA_HOME/bin:$PATH"

# Required for local Gradle builds. Keep APK small: arm64-v8a only.
echo 'sdk.dir=/opt/homebrew/share/android-commandlinetools' > android/local.properties
grep -q '^reactNativeArchitectures=arm64-v8a' android/gradle.properties || \
  printf '\nreactNativeArchitectures=arm64-v8a\n' >> android/gradle.properties

bun install
bunx tsc --noEmit
cd android
./gradlew assembleRelease
cd ../..
cp cracker-mobile/android/app/build/outputs/apk/release/app-release.apk cracker.apk
```

Use Java 17 for Android builds. Java 21+ is misleading here and can fail with this React Native/Gradle setup.

The latest local build output is `cracker.apk` in the repo root.

## Clean Android rebuild after Expo/native changes

```bash
cd cracker-mobile
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$PATH"

bunx expo prebuild --clean --platform android
./scripts/copy-foreground-icons.sh
printf '\norg.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home\nreactNativeArchitectures=arm64-v8a\n' >> android/gradle.properties
echo 'sdk.dir=/opt/homebrew/share/android-commandlinetools' > android/local.properties
bunx tsc --noEmit
cd android && ./gradlew assembleRelease
cd ../..
cp cracker-mobile/android/app/build/outputs/apk/release/app-release.apk cracker.apk
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
