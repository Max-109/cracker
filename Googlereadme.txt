# Project: ChatGPT Clone (Next.js + AI SDK)

## 🛠 Technical Stack & Tools
- **Package Manager**: `bun` (STRICTLY use `bun` for all commands. DO NOT use `npm`.)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Configured via CSS variables in `app/globals.css` - `@theme inline`)
- **Icons**: `lucide-react`
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) + OpenRouter
- **Database**: PostgreSQL (Neon) via `drizzle-orm` & `postgres` driver (postgres-js)

## 💾 Database & Persistence
- **ORM**: Drizzle ORM
- **Schema**: Defined in `db/schema.ts`
  - `chats`: `id` (uuid), `title` (text), `createdAt` (timestamp)
  - `messages`: `id` (uuid), `chatId` (uuid), `role` (text), `content` (jsonb), `createdAt` (timestamp)
- **Connection**: `db/index.ts` uses `postgres` (postgres-js) for transaction pooling compatibility.
- **Persistence Logic**:
  - Chat history is fetched via `/api/chats`.
  - Individual chat messages are fetched via `/api/chats/[id]`.
  - **Critical**: AI responses are saved in the `onFinish` callback in `ChatInterface.tsx`. We now prioritize saving `message.parts` as JSON to the DB to preserve structured "thinking" blocks vs final content.
  - **Fallback Mechanism**: If `message.content` is empty in `onFinish` (common with some reasoning models), we fallback to `message.parts`, or inspect the React state (`messagesRef.current`) to recover the generated text.

## 🧠 Reasoning & Thinking Features
- **Reasoning Models**: Supports models like DeepSeek R1 and OpenAI o1 via OpenRouter.
- **Persistence**: Reasoning data is stored structurally in the DB (JSONB) and reconstructed on load, ensuring thinking blocks don't merge with answers on refresh.
- **UI Implementation**:
  - Reasoning is displayed in a collapsible accordion labeled with random thinking verbs (e.g., "Simmering", "Pondering").
  - **Animation**: Custom ASCII spinner (`·`, `✻`, `✽`, `✶`, `✳`, `✢`) cycling at 120ms.
- **Parsing**:
  - Handles explicit `reasoning` parts from the AI SDK.
  - Fallback: Parses `<think>...</think>` tags from raw text streams if the provider doesn't separate them.

## 🎨 Frontend Architecture & Components

### `ChatInterface.tsx`
- **Role**: Now purely handles the conversation view (messages, input, streaming).
- **Refactor**: Sidebar logic removed; consumes `ChatContext` for sidebar toggling and chat refreshing.
- **State Management**: Complex interplay between local state (`currentChatId`) and `useChat` hook.
- **Settings Persistence**: Uses `localStorage` to persist user preferences (`currentModelId`, `currentModelName`, `reasoningEffort`) across sessions.
- **Infinite Loop Fix**: Uses `ignoreNextChatIdChangeRef` to prevent `useEffect` from overwriting `useChat` state when a new chat is created locally.
- **Performance**:
  - Implements `ThrottledMessageItem` to throttle AI text updates to ~100ms (10fps) to prevent main thread blocking during high-speed token streaming.
  - Uses `FadeWrapper` for smooth loading transitions (skeleton -> content).

### `AppLayout.tsx` & `ChatContext.tsx` (New Architecture)
- **Global State**: Moved Sidebar state (`chats`, `isLoading`, `isSidebarOpen`) to `ChatContext` to persist across navigation.
- **Layout Structure**: `AppLayout` wraps the application, ensuring the Sidebar doesn't re-render/reload when switching chats. This fixes the "flickering skeleton" issue on navigation.
- **Mobile Support**: Handles mobile sidebar toggling and overlays globally.

### `MessageItem.tsx` (The Core Renderer)
- **Markdown**: `react-markdown` with `remark-gfm` (tables) and `remark-math` (LaTeX).
- **LaTeX Handling**:
  - **Critical Fix**: Preprocesses content to convert `\[...\]` and `\(...\)` to standard `$$` delimiters.
  - **Critical Fix**: Renders paragraphs as `<div>` instead of `<p>` to prevent hydration errors when `$$` blocks (which render as divs) are nested inside.
- **Code Highlighting**: `react-syntax-highlighter` (Prism) with `oneDark` theme.
- **Memoization**: Heavily memoized (component & plugins) to avoid expensive re-renders during streaming.

### `Sidebar.tsx`
- **Sticky New Chat**: The "New Chat" button is outside the scroll container to remain visible always.
- **Grouping**: Chats are grouped by date (Today, Yesterday, Previous 7 Days, Older).
- **Loading State**: Uses absolute positioned overlay (`FadeWrapper` with `isAbsolute`) for skeletons to prevent layout shifts/jumps when content loads.
- **Scrollbar**: Custom CSS in `globals.css` makes the scrollbar transparent by default, only appearing dark/visible on hover (ChatGPT style).

## 🚀 Deployment & Build
- **Build Command**: `bun run build`
- **Environment**: Requires `.env` with:
  - `DATABASE_URL` (Neon Postgres)
  - `OPENROUTER_API_KEY`
- **Known Warning**: "Detected multiple lockfiles" (bun.lock + package-lock.json). This is expected in this env; we prioritize `package-lock.json` for compatibility but run with `bun`.

## ⚠️ Important Notes for Next Session
1. **Do NOT remove `ThrottledMessageItem`**: It is essential for performance with fast models.
2. **Do NOT revert `MessageItem` <p> to <div> change**: This will break LaTeX rendering.
3. **Persistence**: Always check `onFinish` logic if users report "messages not saving". The fallback to `messagesRef` is critical.
4. **Risk Level**: When editing `ChatInterface.tsx`, be extremely careful with `useEffect` dependencies to avoid triggering the infinite update loop again.
