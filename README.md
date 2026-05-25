<div align="center">
  <img src="./app/icon-template.svg" width="84" alt="Cracker mark" />
  <h1>Cracker</h1>
  <p><strong>AI chat web and mobile app focused on UI/UX.</strong></p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="React" src="https://img.shields.io/badge/React-19-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Expo" src="https://img.shields.io/badge/Expo-SDK%2056-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="Redis" src="https://img.shields.io/badge/Redis%2FValkey-cache%20%2B%20sync-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
    <img alt="AI SDK" src="https://img.shields.io/badge/AI%20SDK-v5-%23d4a86b?style=for-the-badge&labelColor=3f3f46" />
  </p>
  <table>
    <tr>
      <th>Web version</th>
      <th>Mobile version</th>
    </tr>
    <tr>
      <td><img src="./cracker.gif" alt="Cracker web app preview" width="560" /></td>
      <td><img src="./cracker-mobile.gif" alt="Cracker mobile app preview" width="260" /></td>
    </tr>
  </table>
</div>

## What is Cracker?

Cracker is a private AI chat app built around an OpenAI-compatible backend, with a Next.js web app and an Expo React Native mobile app. It uses PostgreSQL as the source of truth and optional Redis/Valkey for faster settings sync, cache hits, and lightweight coordination.

It has encrypted chat storage, local auth, model switching, file attachments, web tools, learning mode, memory, and a matching mobile app.

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
- Expo SDK 56 / React Native Android app in `cracker-mobile/`, targeting `https://cracker.mom` by default.

## Tech stack

| Part | Tech |
| --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS v4 |
| Mobile | Expo SDK 56, React Native 0.85, Expo Router |
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

# Optional tools
BRAVE_API_KEY=
YOUTUBE_API_KEY=
TAVILY_API_KEY=

# Optional Redis cache/sync backend
# Prefer this for your own VPS Redis/Valkey:
REDIS_URL=redis://:password@your-vps:6379
# Or use Upstash REST instead:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# Optional namespace / forced DB-only mode:
REDIS_PREFIX=cracker:
REDIS_DISABLED=false
```

`DATABASE_URL` may also be `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL_NON_POOLING`. `PROXY_API_KEY` is accepted instead of `OPENAI_API_KEY`.

Redis is optional. If Redis vars are unset, the app falls back to PostgreSQL-only behavior. Use `REDIS_URL` for a VPS Redis/Valkey instance; Upstash REST vars are supported as a serverless fallback. Never expose Redis credentials with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.

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

## Run Android in an emulator

Install the emulator and an Android 36 ARM image once:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

yes | sdkmanager "emulator" "system-images;android-36;google_apis;arm64-v8a"
printf 'no\n' | avdmanager create avd \
  -n cracker_api36 \
  -k "system-images;android-36;google_apis;arm64-v8a" \
  -d pixel_7 \
  --force
```

Start the emulator:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

emulator -avd cracker_api36 -no-snapshot -no-audio -no-boot-anim -gpu swiftshader_indirect
```

In another terminal, wait for boot, install the APK, launch the app, and capture logs:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$PATH"

adb wait-for-device
until adb shell getprop sys.boot_completed | grep -q 1; do sleep 2; done

adb install -r cracker.apk
adb logcat -c
adb shell am force-stop com.cracker.mobile
adb shell am start -W -n com.cracker.mobile/.MainActivity
sleep 10
adb logcat -d -v threadtime > cracker-logcat.txt
```

Useful crash filters:

```bash
grep -E 'FATAL EXCEPTION|AndroidRuntime|ReactNativeJS|UnsatisfiedLinkError|SoLoader|Nitro|MMKV|QuickCrypto|Reanimated|com\.cracker\.mobile' cracker-logcat.txt
```

Take a screenshot from the emulator:

```bash
adb exec-out screencap -p > cracker-screen.png
```

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
