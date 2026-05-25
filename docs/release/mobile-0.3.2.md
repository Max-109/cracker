# mobile 0.3.2

## highlights

- moved the mobile app to Expo SDK 56, React Native 0.85, and React 19.2
- fixed the Reanimated/Gesture Handler Android crash from the SDK 56 upgrade
- updated Nitro-based native packages for the new React Native stack
- added adaptive chat and drawer skeleton loading states
- improved mobile chat syncing while switching and refreshing chats
- made drawer pull-to-refresh available from the new-chat screen too
- added long-press chat actions on mobile for rename and delete, using Cracker-styled dialogs
- synced settings continuously while the mobile app is open or foregrounded
- added version-aware settings sync with ETag / 304 support to avoid unnecessary refresh work
- added optional Redis/Valkey support for VPS `REDIS_URL`, with Upstash fallback and DB-only fail-open mode
- cached settings, auto-reasoning results, and latest assistant stats through Redis when available
- synced more settings through the shared settings API, including accent color and fast mode
- changed empty/new-chat copy to “What can I help with?” for a smoother start state
- improved mobile streaming, rendering, syntax highlighting, quote styling, and tokens/sec display
- documented emulator setup, APK install, logcat capture, screenshot commands, and Redis env vars

## validation

- `bunx tsc --noEmit`
- `bun run build`
- `cd cracker-mobile && bunx tsc --noEmit`
- Android release build with Java 17
- emulator install and launch with `adb logcat` crash check
