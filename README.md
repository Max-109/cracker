# ChatGPT Clone

A modern, feature-rich ChatGPT clone built with Next.js 16, featuring multi-model support, reasoning capabilities, and a customizable UI.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Bun** | Package manager & runtime |
| **Tailwind CSS v4** | Styling with CSS variables |
| **Vercel AI SDK** | AI streaming & chat management |
| **Drizzle ORM** | Database ORM |
| **PostgreSQL (Neon)** | Serverless database |
| **Google Vertex AI** | Gemini models via Vertex AI |
| **Google AI SDK** | Gemini models with native support |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- PostgreSQL database (we use [Neon](https://neon.tech/))
- Google Cloud project with Vertex AI enabled (for Vertex AI models)
- Google AI API key (optional, for Google AI SDK models)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd testchatgpt

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
bun run db:push

# Start development server
bun dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://...

# Google Vertex AI (required)
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google AI SDK (optional, for non-Vertex models)
GOOGLE_GENERATIVE_AI_API_KEY=...

# Deep Search (optional, uses Tavily for research)
TAVILY_API_KEY=...

# Web Search Tool (optional, uses Brave Search API)
# Get a free API key at https://brave.com/search/api/
BRAVE_API_KEY=...
```

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── chat/               # Main chat endpoint
│   │   ├── chats/              # Chat CRUD operations
│   │   ├── messages/           # Message management
│   │   └── generate-title/     # Auto title generation
│   ├── chat/[id]/              # Dynamic chat pages
│   ├── components/             # App-specific components
│   │   ├── ChatInterface.tsx   # Main chat orchestrator
│   │   ├── ChatInput.tsx       # Input area with attachments
│   │   ├── MessageList.tsx     # Message rendering
│   │   ├── ModelSelector.tsx   # Model & color picker
│   │   ├── MessageItem.tsx     # Individual message
│   │   ├── Sidebar.tsx         # Chat history sidebar
│   │   └── ...
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAttachments.ts   # File upload handling
│   │   └── usePersistedSettings.ts # LocalStorage persistence
│   └── globals.css             # Global styles & CSS variables
├── components/
│   └── ui/                     # Reusable UI components
│       ├── button.tsx
│       ├── icon-button.tsx
│       ├── dropdown.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── fade-wrapper.tsx
│       ├── spinner.tsx
│       ├── circular-progress.tsx
│       ├── error-alert.tsx
│       ├── backdrop.tsx
│       └── index.ts            # Barrel exports
├── db/
│   ├── schema.ts               # Drizzle schema definitions
│   └── index.ts                # Database connection
├── lib/
│   ├── utils.ts                # Utility functions (cn, etc.)
│   ├── chat-types.ts           # TypeScript types
│   ├── mcp/                    # MCP (Model Context Protocol) client
│   │   └── mcp-client.ts       # Remote MCP server connections
│   └── tools/                  # AI SDK Tool definitions
│       └── brave-tools.ts      # Web search tools (Brave API)
└── drizzle/                    # Database migrations
```

## Tool Servers (MCP Integration)

The application supports AI tool calling through the Vercel AI SDK. Currently, web search is implemented via Brave Search API.

### Architecture Overview

```
User Query → Chat API → Gemini Model → Tool Call → Brave API → Response
```

**Key Files:**
- `lib/tools/brave-tools.ts` - Tool definitions using AI SDK `tool()` helper
- `lib/mcp/mcp-client.ts` - MCP client for remote server connections (future use)
- `app/api/chat/route.ts` - Integrates tools into `streamText()` call
- `app/components/SettingsDialog.tsx` - UI for enabling/disabling tools
- `app/hooks/usePersistedSettings.ts` - `useEnabledMcpServers()` hook
- `db/schema.ts` - `enabledMcpServers` field in `userSettings` table

### Adding a New Tool Server

To add a new tool (e.g., image generation, code execution):

#### 1. Create Tool Definition

> [!CAUTION]
> **CRITICAL FOR VERTEX AI:** You MUST use `inputSchema` with `zodSchema()` wrapper (NOT `parameters` with raw Zod).
> The AI SDK internally reads `tool.inputSchema`, NOT `tool.parameters`. Using `parameters` or raw `z.object()` 
> will cause: `functionDeclaration parameters schema should be of type OBJECT` error.
> 
> **DO NOT USE:**
> - `parameters: z.object({...})` ❌
> - `tool({ parameters: z.object({...}) })` ❌
> 
> **CORRECT FORMAT:**
> - `inputSchema: zodSchema(z.object({...}))` ✅

Create a new file in `lib/tools/`:

```typescript
// lib/tools/my-new-tool.ts
import { z } from 'zod';
import { zodSchema } from 'ai';  // CRITICAL: Import zodSchema wrapper

// Define Zod schema separately for type inference
const myToolSchema = z.object({
  query: z.string().describe('What the parameter is for'),
});

type MyToolInput = z.infer<typeof myToolSchema>;

interface MyToolOutput {
  result: string;
}

// CRITICAL: Use inputSchema with zodSchema() wrapper, NOT parameters
export const myNewTool = {
  description: 'Description for the AI to understand when to use this tool',
  inputSchema: zodSchema(myToolSchema),  // ✅ CORRECT for Vertex AI
  execute: async (args: MyToolInput): Promise<MyToolOutput> => {
    const { query } = args;
    const apiKey = process.env.MY_TOOL_API_KEY;
    if (!apiKey) {
      return { result: 'API key not configured' };
    }
    // Call external API
    const response = await fetch('https://api.example.com/...', { ... });
    return { result: await response.json() };
  },
};

export const myTools = {
  my_new_tool: myNewTool,
};

export function getEnabledMyTools(enabledServers: string[]) {
  if (enabledServers.includes('my-tool-slug') && process.env.MY_TOOL_API_KEY) {
    return myTools;
  }
  return {};
}
```

**Why this matters:** The Vercel AI SDK's `tool()` helper incorrectly sets `parameters` with raw Zod 
but leaves `inputSchema` undefined. The `@ai-sdk/google` provider reads `tool.inputSchema` (line 558 
in internal code), so custom tools fail silently. The `zodSchema()` wrapper creates the correct 
internal format with JSON schema conversion that Vertex AI accepts.

> [!IMPORTANT]
> **MULTI-STEP TOOL CALLING (AI SDK v5):** For tools to work properly with Vertex AI, you must:
> 1. Use `stopWhen: stepCountIs(N)` in `streamText()` instead of `maxSteps`
> 2. Use `toolCallStreaming: true` for live UI updates during tool execution
> 3. Import `stepCountIs` from `'ai'`
> 4. Save tool results from the `steps` array in `onFinish` callback
>
> **Why this matters:** When the model calls a tool, it needs to continue generating after receiving 
> results. Without `stopWhen: stepCountIs(5)`, the model stops after the first tool call with 
> `finishReason: 'tool-calls'` and never produces the final text response.

> [!CAUTION]
> **AI SDK v5 PROPERTY NAMES:** The SDK uses different property names than you might expect:
> 
> | What | OLD Name | AI SDK v5 Name |
> |------|----------|----------------|
> | Tool arguments | `args` | `input` |
> | Tool result | `result` | `output` |
> | All tool calls | `toolCalls` (from callback) | `steps[].toolCalls` |
> | All tool results | `toolResults` (from callback) | `steps[].toolResults` |
>
> The `onFinish` callback's `toolCalls` and `toolResults` only contain the **LAST step's** data.
> To get ALL tool calls across multi-step execution, you MUST iterate through the `steps` array.

```typescript
import { streamText, stepCountIs } from 'ai';

const result = streamText({
  model: vertex(modelId),
  messages,
  tools,
  stopWhen: stepCountIs(5),      // ✅ Enables multi-step: tool call → result → final text
  toolCallStreaming: true,       // ✅ Stream tool invocations to client for live UI
  onFinish: async ({ text, steps }) => {
    // CRITICAL: Collect tool calls from ALL steps (not just the last one)
    const allToolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
    const allToolResults: Array<unknown> = [];

    if (steps && steps.length > 0) {
      for (const step of steps) {
        // AI SDK v5: toolCalls have { toolCallId, toolName, input } (NOT args!)
        // AI SDK v5: toolResults have { toolCallId, toolName, output } (NOT result!)
        const stepToolCalls = step.toolCalls || [];
        const stepToolResults = step.toolResults || [];
        
        for (let i = 0; i < stepToolCalls.length; i++) {
          allToolCalls.push({
            toolCallId: stepToolCalls[i].toolCallId,
            toolName: stepToolCalls[i].toolName,
            args: stepToolCalls[i].input,  // ⚠️ 'input' not 'args'!
          });
          if (stepToolResults[i]) {
            allToolResults.push(stepToolResults[i].output);  // ⚠️ 'output' not 'result'!
          }
        }
      }
    }

    // Save tool invocations to DB for persistence
    const parts = [];
    for (let i = 0; i < allToolCalls.length; i++) {
      parts.push({
        type: 'tool-invocation',
        toolCallId: allToolCalls[i].toolCallId,
        toolName: allToolCalls[i].toolName,
        state: 'result',
        args: allToolCalls[i].args,
        result: allToolResults[i],  // We store as 'result' for our internal format
      });
    }
    if (text) parts.push({ type: 'text', text });
    // Save parts to database...
  },
});
```


#### 2. Register in Chat Route

Update `app/api/chat/route.ts`:

```typescript
import { getEnabledBraveTools } from '@/lib/tools/brave-tools';
import { getEnabledMyTools } from '@/lib/tools/my-new-tool'; // Add import

// In POST handler, combine tools:
const braveTools = getEnabledBraveTools(mcpServers);
const myTools = getEnabledMyTools(mcpServers); // Add this
const tools = { ...braveTools, ...myTools };   // Merge tools
```

#### 3. Add UI Toggle in Settings

Update `AVAILABLE_SERVERS` in `app/components/SettingsDialog.tsx`:

```typescript
const AVAILABLE_SERVERS = [
  { 
    slug: 'brave-search',
    name: 'Web Search',
    description: 'Search the web for current information',
    icon: Search,
  },
  { 
    slug: 'my-tool-slug',  // Must match the slug in getEnabledMyTools
    name: 'My New Tool',
    description: 'What this tool does',
    icon: SomeIcon,        // Import from lucide-react
  },
];
```

#### 4. Add Environment Variable

Add to `.env`:
```
MY_TOOL_API_KEY=...
```

### Current Tool Servers

| Slug | Name | Description | API Key |
|------|------|-------------|--------|
| `brave-search` | Web Search | Search web for current info | `BRAVE_API_KEY` |

### User Settings

Enabled tools are stored per-user in the `enabledMcpServers` JSONB field in `user_settings` table. Default: `['brave-search']`.

The settings flow:
1. User toggles tool in Settings → Tools tab
2. `useEnabledMcpServers()` hook updates settings via API
3. `ChatInterface` passes `enabledMcpServers` to chat transport
4. Chat API receives it and loads appropriate tools
5. Gemini model can now call those tools during response generation

### Tool Call Indicator UI

Tool invocations are displayed in the chat UI via `ToolCallIndicator.tsx`. This component:
- Shows the tool name and search query during execution (with loading spinner)
- Displays results with clickable links after completion
- Expands/collapses to show detailed results
- Persists to database so it shows correctly on page refresh

**Key files for UI:**
- `app/components/ToolCallIndicator.tsx` - Main indicator component
- `app/components/MessageItem.tsx` - Parses tool invocations from message parts

#### How Tool Invocations are Parsed

In `MessageItem.tsx`, tool invocations are extracted from message parts:

```typescript
// Tool invocation structure from AI SDK
interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  state: 'partial-call' | 'call' | 'result';
  args?: Record<string, unknown>;  // Contains query, etc.
  result?: unknown;                 // Contains search results
}

// Parsing in MessageItem
if (part.type === 'tool-invocation') {
  const toolCallId = toolPart.toolCallId || toolPart.toolInvocation?.toolCallId;
  const toolName = toolPart.toolName || toolPart.toolInvocation?.toolName;
  const toolState = toolPart.state || toolPart.toolInvocation?.state;
  const toolArgs = toolPart.args || toolPart.toolInvocation?.args;
  const toolResult = toolPart.result || toolPart.toolInvocation?.result;
  
  toolInvocations.push({ toolCallId, toolName, state: toolState, args: toolArgs, result: toolResult });
}
```

#### Adding Custom Tool Display Names/Icons

To customize how your tool appears in the indicator, update `ToolCallIndicator.tsx`:

```typescript
// Add icon mapping
function getToolIcon(toolName: string) {
  switch (toolName) {
    case 'brave_news_search':
      return Newspaper;
    case 'my_custom_tool':
      return MyIcon;  // Your custom icon
    default:
      return Search;
  }
}

// Add display name mapping
function getToolDisplayName(toolName: string): string {
  switch (toolName) {
    case 'brave_web_search':
      return 'Web Search';
    case 'my_custom_tool':
      return 'My Custom Tool';
    default:
      return toolName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
```

#### Result Extraction

The `extractSearchResults` function in `ToolCallIndicator.tsx` parses tool results. Update it for custom result formats:

```typescript
function extractSearchResults(result: unknown): SearchResult[] {
  if (!result || typeof result !== 'object') return [];
  const resultObj = result as Record<string, unknown>;
  
  // Handle your tool's result format
  if (Array.isArray(resultObj.results)) {
    return resultObj.results.map((r) => ({
      title: r.title || 'Untitled',
      url: r.url || '',
      description: r.description || undefined,
    }));
  }
  return [];
}
```

## UI Component Library

All reusable UI components are in `components/ui/`. Import from the barrel file:

```tsx
import { 
  Button, 
  IconButton, 
  Dropdown, 
  DropdownItem,
  Dialog,
  Input,
  Textarea,
  Spinner,
  FadeWrapper 
} from '@/components/ui';
```

### Available Components

#### Button
Primary action button with variants.

```tsx
<Button variant="default">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="icon"><Icon /></Button>
```

#### IconButton
Square button for icons with hover effects.

```tsx
<IconButton variant="default" rotateOnHover>
  <Paperclip size={18} />
</IconButton>
<IconButton variant="primary" size="lg">
  <ArrowUp size={18} />
</IconButton>
<IconButton variant="accent">
  <Square size={14} />
</IconButton>
```

#### Dropdown
Dropdown menu with render prop support.

```tsx
<Dropdown 
  align="right" 
  position="top"
  trigger={<DropdownTrigger>Select</DropdownTrigger>}
>
  {(close) => (
    <>
      <DropdownLabel>Options</DropdownLabel>
      <DropdownItem onClick={() => { doSomething(); close(); }}>
        Option 1
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem selected>Option 2</DropdownItem>
    </>
  )}
</Dropdown>
```

#### Dialog
Modal dialog with header, content, and footer.

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogHeader>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description text</DialogDescription>
  </DialogHeader>
  <DialogContent>
    <Input value={value} onChange={...} />
  </DialogContent>
  <DialogFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button onClick={handleSubmit}>Save</Button>
  </DialogFooter>
</Dialog>
```

#### FadeWrapper
Smooth fade in/out transitions for content.

```tsx
<FadeWrapper show={isLoading} isAbsolute>
  <Skeleton />
</FadeWrapper>
```

#### Spinner & CircularProgress
Loading indicators.

```tsx
<Spinner size="sm" variant="accent" />
<CircularProgress progress={75} size={48} />
```

## Custom Hooks

### useAttachments
Handles file uploads with progress tracking and paste support.

```tsx
const {
  attachments,
  hasPendingAttachments,
  handleFileSelect,
  handlePaste,
  removeAttachment,
  clearAttachments,
} = useAttachments();
```

### usePersistedSetting
Persists values to localStorage with SSR-safe hydration.

```tsx
const [value, setValue, isHydrated] = usePersistedSetting('KEY', 'default');
```

### useAccentColor
Manages theme accent color with CSS variable updates.

```tsx
const { accentColor, setAccentColor, isHydrated } = useAccentColor();
```

## Features

### Gemini Models
- **Vertex AI**: Enterprise-grade Gemini models via Google Vertex AI
- **Google AI SDK**: Direct Gemini access with thinking/reasoning support
- **3 Model Tiers**:
  - **Expert** (gemini-3-pro-preview): Most capable, best reasoning
  - **Balanced** (gemini-2.5-flash): Fast and accurate
  - **Ultra Fast** (gemini-2.5-flash-lite): Fastest responses
- **Image Generation**: Toggle in prompt box to enable image generation (uses gemini-3-pro-image-preview)

### Reasoning & Thinking
- Collapsible reasoning blocks for models like DeepSeek R1, Gemini
- Thinking effort levels: Low, Medium, High
- Structured persistence of reasoning in database

### File Attachments
- Drag & drop or click to upload
- Paste images from clipboard
- Progress tracking with circular indicator
- Support for images and documents (PDF, images, text files)

### Enhanced UI & Visual Effects
- **Visual Overhaul**: Premium "Living Interface" aesthetic with subtle noise textures and vignettes.
- **Glassmorphism**: Sidebar and mobile menus feature frosted glass effects (`backdrop-blur`).
- **Command Palette** (`Cmd+K`): Global keyboard navigation to quickly switch chats, models, or modes.
- **Mobile Control Center**: Swipeable bottom sheet for easy access to settings on mobile devices.
- **Thought Stream**: Circuit-board style visualization for Deep Research progress.
- **Micro-Interactions**: Glitch hover effects, magnetic buttons, and "Focus Mode" that dims the UI when typing.

#### Supported File Types

| Type | MIME Types | Notes |
|------|-----------|-------|
| **Images** | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | Displayed inline, sent as base64 data URLs |
| **PDFs** | `application/pdf` | Full document understanding via Gemini |
| **Text** | `text/plain`, `text/markdown`, `text/csv` | Parsed and sent as file content |
| **Code** | `application/javascript`, `text/typescript`, etc. | Syntax-aware processing |

#### Message Format for Attachments

The Vercel AI SDK with **Vertex AI** requires a specific format for multimodal messages. This is **critical** for attachments to work.

> **IMPORTANT**: Vertex AI requires the `type: 'file'` format for **BOTH images and documents**. The `type: 'image'` format does NOT work with Vertex AI!

**For ALL attachments (images AND files):**
```typescript
{
  type: 'file',                  // Always 'file', even for images!
  filename: 'image.png',         // Required!
  mediaType: 'image/png',        // Required! (NOT mimeType)
  url: 'data:image/png;base64,iVBORw0KGgo...' // Full data URL (NOT data)
}
```

**Examples:**
```typescript
// Image attachment
{ type: 'file', filename: 'photo.jpg', mediaType: 'image/jpeg', url: dataUrl }

// PDF attachment  
{ type: 'file', filename: 'document.pdf', mediaType: 'application/pdf', url: dataUrl }

// Text file attachment
{ type: 'file', filename: 'notes.txt', mediaType: 'text/plain', url: dataUrl }
```

**Complete Message Structure:**
```typescript
// Frontend sends to API
{
  id: 'msg-123',
  role: 'user',
  parts: [  // Must use 'parts', not 'content' for multimodal
    { type: 'text', text: 'What is in this document?' },
    { type: 'file', filename: 'doc.pdf', mediaType: 'application/pdf', url: dataUrl }
  ]
}
```

#### Frontend Implementation (ChatInterface.tsx)

```typescript
// 1. useAttachments hook provides file data
const { attachments, handleFileSelect, clearAttachments } = useAttachments();

// 2. When sending, convert ALL attachments to 'file' type format
// Vertex AI requires 'file' type even for images!
const aiParts = finalContent.map(part => {
  if (part.type === 'text') {
    return { type: 'text', text: part.text };
  }
  if (part.type === 'image') {
    // IMPORTANT: Use 'file' type, not 'image' - Vertex AI requirement!
    return { 
      type: 'file', 
      filename: part.name || 'image.png',
      mediaType: part.mediaType || 'image/png',
      url: part.image  // 'image' property contains the data URL
    };
  }
  if (part.type === 'file') {
    return { 
      type: 'file', 
      filename: part.filename || part.name || 'file',
      mediaType: part.mediaType || 'application/octet-stream',
      url: part.data  // 'data' property contains the data URL
    };
  }
});

// 3. Send with parts (not content)
await sendMessage({ role: 'user', parts: aiParts });
```

#### Backend Processing (app/api/chat/route.ts)

```typescript
// Messages arrive with 'parts' array
// convertToModelMessages handles the conversion to Vertex AI format
const result = streamText({
  model: vertex(modelId),
  messages: convertToModelMessages(processedMessages as UIMessage[]),
});
```

#### Common Pitfalls

| Issue | Wrong | Correct |
|-------|-------|---------|
| **Image type** | `type: 'image'` | `type: 'file'` (Vertex AI requirement!) |
| Property name | `data: base64` | `url: dataUrl` |
| MIME type key | `mimeType: 'application/pdf'` | `mediaType: 'application/pdf'` |
| Missing filename | `{ type: 'file', url: ... }` | `{ type: 'file', filename: 'doc.pdf', url: ... }` |
| Parts vs Content | `content: [...]` | `parts: [...]` |
| Base64 vs Data URL | `data: 'JVBERi0...'` | `url: 'data:application/pdf;base64,JVBERi0...'` |

> **Note**: The `type: 'image'` format works with some providers (like OpenAI) but **does NOT work with Google Vertex AI**. Always use `type: 'file'` with the appropriate `mediaType` for Vertex AI.

#### Testing Attachments

Run the test scripts to verify attachment handling:

```bash
# Test all attachment types (images + PDFs)
bun scripts/test-all-attachments.ts

# Test PDF specifically
bun scripts/test-attachment.ts

# Test image formats (debugging)
bun scripts/test-image.ts
```

### Real-time Streaming
- Token-by-token streaming display
- Tokens per second (TPS) metrics
- Direct streaming via Vercel AI SDK (no background jobs)

### Customization
- Dynamic accent color picker
- Syntax highlighting adapts to accent
- Favicon updates with accent color

## Database Schema

```typescript
// Chats table
chats: {
  id: uuid (primary key)
  title: text
  userId: uuid (foreign key)
  mode: text ('chat' | 'deep-search')
  createdAt: timestamp
}

// Messages table
messages: {
  id: uuid (primary key)
  chatId: uuid (foreign key)
  role: text ('user' | 'assistant')
  content: jsonb (parts array)
  model: text
  tokensPerSecond: text
  createdAt: timestamp
}

// User settings table
userSettings: {
  id: uuid (primary key)
  userId: uuid (unique)
  currentModelId: text
  currentModelName: text
  reasoningEffort: text
  responseLength: integer
  accentColor: text
  userName: text
  userGender: text
  learningMode: boolean
  customInstructions: text
}
```

## Scripts

```bash
bun dev          # Start development server
bun build        # Production build
bun start        # Start production server
bun lint         # Run ESLint
bun db:push      # Push schema to database
bun db:studio    # Open Drizzle Studio
```

## Android App

The app can be packaged as an Android APK using Capacitor. The APK loads the deployed website (`https://cracker.mom`) in a native WebView container.

### Prerequisites

```bash
# Install Java 17 (required)
brew install openjdk@17

# Install Android SDK
brew install --cask android-commandlinetools
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

### Building the APK

```bash
# 1. Patch Capacitor for Java 17 compatibility
sed -i '' 's/VERSION_21/VERSION_17/g' node_modules/@capacitor/android/capacitor/build.gradle

# 2. Sync web assets
npx cap sync android

# 3. Patch local gradle files (regenerated by sync)
sed -i '' 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle android/capacitor-cordova-android-plugins/build.gradle

# 4. Build signed release APK
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
cd android && ./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Configuration

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | App name, ID, and website URL |
| `android/app/build.gradle` | Signing config, version code |
| `android/cracker-release.keystore` | Signing key (keep secure!) |

### Updating the App

When you deploy changes to your website, the app automatically loads the new version. To change the target URL, edit `capacitor.config.ts`:

```typescript
server: {
  url: 'https://your-new-url.com',
}
```

Then rebuild the APK.

## Architecture Decisions

### Why Bun?
- Faster package installation
- Built-in TypeScript support
- Compatible with npm packages

### Why CSS Variables for Theming?
- Runtime color changes without rebuild
- Single source of truth for colors
- Easy accent color customization

### Why Separate UI Components?
- Reusability across features
- Consistent styling
- Easier testing and maintenance
- Single responsibility principle

### Component Organization
- `app/components/` - Feature-specific components
- `components/ui/` - Generic, reusable UI primitives
- `app/hooks/` - Feature-specific hooks
- `lib/` - Utilities and types

## Design System: Dropdowns & Selection Components

This section documents the design language and patterns used for dropdown menus and selection components. Follow these guidelines to maintain visual consistency.

### Core Principles

1. **Single Accent Color**: Use only `var(--text-accent)` for all highlighting - never introduce additional colors for different states
2. **Intensity Over Color**: Differentiate items using opacity, borders, and visual weight rather than different hues
3. **No Checkmarks**: Selection is indicated through accent color backgrounds and borders, not checkmark icons
4. **Progressive Disclosure**: More important/powerful options should appear visually "stronger"

### Accent Color Usage

The accent color is user-customizable and stored in CSS variables:

```css
--text-accent: #af8787;    /* Main accent color */
--border-active: #af8787;  /* Active border color (same as accent) */
```

#### Intensity Levels (for visual hierarchy)

Use opacity modifiers to create hierarchy while staying within the accent color family:

| Level | Opacity | Use Case |
|-------|---------|----------|
| **Full** | `opacity-100` | Selected/active items, primary actions |
| **High** | `opacity-75-80` | Secondary tier items |
| **Medium** | `opacity-50-60` | Tertiary tier items |
| **Low** | `opacity-30-45` | Lowest tier, subtle hints |

```tsx
// Example: Tier-based opacity
const opacityClass = level === 4 ? 'opacity-100' 
                   : level === 3 ? 'opacity-75' 
                   : level === 2 ? 'opacity-50' 
                   : 'opacity-30';
```

### Dropdown Structure

Every dropdown should follow this structure:

```
┌─────────────────────────────────┐
│ [Icon] HEADER LABEL             │  ← Dark header with accent icon
├─────────────────────────────────┤
│ [Icon] Item Name         ▐▐▐▐  │  ← Item with intensity bars
│        Description             │
│ [Icon] Item Name         ▐▐▐   │
│        Description             │
│ [Icon] Item Name         ▐▐    │
│        Description             │
├─────────────────────────────────┤
│ Footer hint text               │  ← Optional footer
└─────────────────────────────────┘
```

#### Header Section
```tsx
<div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
  <div className="flex items-center gap-2">
    <IconComponent size={12} className="text-[var(--text-accent)]" />
    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
      Header Label
    </span>
  </div>
</div>
```

#### Dropdown Item Pattern
```tsx
<button
  className={cn(
    "flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm transition-all duration-150 group relative",
    isSelected 
      ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)]" 
      : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
  )}
>
  {/* Icon Box */}
  <div className={cn(
    "w-7 h-7 flex items-center justify-center border transition-all duration-150",
    isSelected 
      ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black" 
      : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"
  )}>
    <Icon size={14} />
  </div>
  
  {/* Text Content */}
  <div className="flex-1 min-w-0">
    <div className={cn(
      "font-semibold uppercase tracking-[0.1em] text-xs",
      isSelected ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
    )}>
      {label}
    </div>
    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
      {description}
    </div>
  </div>

  {/* Visual Indicator (bars, badge, etc.) */}
</button>
```

### Visual Indicators

#### Intensity Bars
Show power/level with ascending bar heights:

```tsx
<div className="flex items-end gap-0.5 h-4">
  {[1, 2, 3, 4].map((bar) => (
    <div
      key={bar}
      className={cn(
        "w-1 transition-all duration-150 bg-[var(--text-accent)]",
        bar === 1 ? "h-1" : bar === 2 ? "h-2" : bar === 3 ? "h-3" : "h-4",
        bar <= currentLevel 
          ? isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-80"
          : "opacity-10"
      )}
    />
  ))}
</div>
```

#### Tier Badges
Differentiate tiers using opacity and border styles:

```tsx
// Level 4 (Highest): Solid with background
"bg-[var(--text-accent)]/20 border border-[var(--text-accent)]"

// Level 3: Lighter background, reduced opacity
"bg-[var(--text-accent)]/10 opacity-80"

// Level 2: Transparent, medium opacity
"bg-transparent opacity-60"

// Level 1 (Lowest): Dashed border, low opacity
"bg-transparent border-dashed opacity-45"
```

#### Premium Indicator (Pulsing Dot)
For top-tier items, add a subtle pulsing indicator:

```tsx
{isPremium && !isSelected && (
  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--text-accent)] animate-pulse" />
)}
```

### Icon Guidelines

#### Icon Selection by Function
| Function | Icon | Package |
|----------|------|---------|
| Quick/Fast | `Zap` | lucide-react |
| Thinking/Brain | `Brain` | lucide-react |
| Intense/High | `Flame` | lucide-react |
| Premium/Special | `Sparkles` | lucide-react |
| Standard/Default | `Cpu` | lucide-react |
| Speed/Ultra | `Rocket` | lucide-react |
| Settings/Custom | `Settings2` | lucide-react |

#### Icon Container States

```tsx
// Default state
"bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)]"

// Hover state (via group-hover)
"group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"

// Selected state
"bg-[var(--text-accent)] border-[var(--text-accent)] text-black"

// Custom/Special item (dashed border)
"border-dashed border-[var(--border-color)]"
```

### Selection Indication (No Checkmarks)

Instead of checkmarks, indicate selection through:

1. **Left Border**: `border-l-2 border-l-[var(--text-accent)]`
2. **Background Tint**: `bg-[var(--text-accent)]/10`
3. **Text Color**: `text-[var(--text-accent)]`
4. **Icon Fill**: Invert icon box to accent background with black icon
5. **Full Opacity**: Bars/badges at 100% opacity

### Animation & Transitions

```tsx
// Dropdown entrance
"animate-in fade-in slide-in-from-bottom-2 duration-150 origin-bottom-right"
// or
"animate-in fade-in zoom-in-95 duration-150 origin-top-left"

// Item transitions
"transition-all duration-150"

// Hover effects
"group-hover:opacity-80"
"group-hover:border-[var(--text-accent)]/50"
```

### Complete Example: Reasoning Effort Dropdown

```tsx
const EFFORT_OPTIONS = [
  { level: 'low', icon: Zap, label: 'Quick', desc: 'Fast responses', bars: 1 },
  { level: 'medium', icon: Brain, label: 'Balanced', desc: 'Standard reasoning', bars: 2 },
  { level: 'high', icon: Flame, label: 'Deep', desc: 'Maximum analysis', bars: 3 },
];

// In render:
<div className="absolute bottom-full right-0 mb-2 w-[220px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-150">
  {/* Header */}
  <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
    <div className="flex items-center gap-2">
      <Sparkles size={12} className="text-[var(--text-accent)]" />
      <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
        Reasoning Effort
      </span>
    </div>
  </div>

  {/* Items */}
  <div className="p-1.5">
    {EFFORT_OPTIONS.map(({ level, icon: Icon, label, desc, bars }) => {
      const isSelected = currentEffort === level;
      return (
        <button key={level} onClick={() => onChange(level)} className={cn(
          "flex items-center gap-3 w-full text-left px-3 py-2.5 group",
          isSelected 
            ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)]" 
            : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
        )}>
          {/* Icon */}
          <div className={cn(
            "w-7 h-7 flex items-center justify-center border",
            isSelected 
              ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black" 
              : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] group-hover:text-[var(--text-accent)]"
          )}>
            <Icon size={14} />
          </div>
          
          {/* Label + Description */}
          <div className="flex-1">
            <div className={cn("font-semibold uppercase tracking-[0.1em] text-xs",
              isSelected ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
            )}>{label}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">{desc}</div>
          </div>

          {/* Intensity Bars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map((bar) => (
              <div key={bar} className={cn(
                "w-1 bg-[var(--text-accent)]",
                bar === 1 ? "h-2" : bar === 2 ? "h-3" : "h-4",
                bar <= bars 
                  ? isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-80"
                  : "opacity-10"
              )} />
            ))}
          </div>
        </button>
      );
    })}
  </div>

  {/* Footer */}
  <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[#0f0f0f]">
    <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
      Higher effort = deeper thinking
    </p>
  </div>
</div>
```

### Dialog / Modal Pattern

Dialogs follow the same header/content/footer structure as dropdowns:

```
┌─────────────────────────────────┐
│ [Icon] DIALOG TITLE             │  ← Dark header with icon box
├─────────────────────────────────┤
│                                 │
│ Main Title                      │
│ Description text...             │
│                                 │
│ ┌─ Warning Box ───────────────┐ │  ← Optional warning
│ │ ⚠ Warning message           │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [Cancel]           [Action]     │  ← Footer with buttons
└─────────────────────────────────┘
```

#### Dialog Structure
```tsx
<AlertDialogContent className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] p-0 gap-0 max-w-[360px]">
  {/* Header */}
  <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 flex items-center justify-center border border-red-400/30 bg-red-400/10">
        <Trash2 size={14} className="text-red-400" />
      </div>
      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)]">
        Dialog Title
      </span>
    </div>
  </div>
  
  {/* Content */}
  <div className="px-4 py-4">
    <AlertDialogHeader className="gap-3">
      <AlertDialogTitle>Main Question</AlertDialogTitle>
      <AlertDialogDescription>Description text...</AlertDialogDescription>
    </AlertDialogHeader>
    
    {/* Warning Box (for destructive actions) */}
    <div className="mt-4 p-3 border border-red-400/20 bg-red-400/5 flex items-start gap-2">
      <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-red-400/80 leading-relaxed">
        Warning message about consequences.
      </p>
    </div>
  </div>
  
  {/* Footer */}
  <AlertDialogFooter className="px-4 py-3 border-t border-[var(--border-color)] bg-[#0f0f0f] flex-row gap-2">
    <AlertDialogCancel className="flex-1 bg-[#1a1a1a] border-[var(--border-color)] ...">
      Cancel
    </AlertDialogCancel>
    <AlertDialogAction className="flex-1 bg-[#1a1a1a] border-red-400/50 text-red-400 hover:bg-red-400 hover:text-black ...">
      Delete
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

#### Dialog Button States
```tsx
// Cancel button - accent hover
"bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)]"

// Destructive action button - red theme
"bg-[#1a1a1a] border-red-400/50 text-red-400 hover:bg-red-400 hover:text-black hover:border-red-400"

// Primary action button - accent theme
"bg-[#1a1a1a] border-[var(--text-accent)]/50 text-[var(--text-accent)] hover:bg-[var(--text-accent)] hover:text-black"
```

### Attachment Preview Pattern

File attachments follow the same design language with icon boxes and badges:

```tsx
{/* Attachments Container */}
<div className="border border-[var(--border-color)] bg-[#1a1a1a] p-3">
  {/* Header */}
  <div className="flex items-center gap-2 mb-3">
    <Paperclip size={12} className="text-[var(--text-accent)]" />
    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)]">
      Attachments
    </span>
    <span className="text-[9px] text-[var(--text-accent)] opacity-70">({count})</span>
  </div>
  
  {/* Attachment Cards */}
  <div className="flex gap-2 overflow-x-auto">
    {attachments.map(attachment => <AttachmentCard ... />)}
  </div>
  
  {/* Pending Status (optional) */}
  {hasPending && (
    <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
      <Spinner size="xs" variant="accent" />
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-accent)]">
        Preparing files...
      </span>
    </div>
  )}
</div>
```

#### Attachment Card Structure
```tsx
// Image attachment
<div className="w-20 h-20 relative">
  <img src={preview} className="w-full h-full object-cover" />
  {/* Type badge overlay */}
  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 border border-[var(--border-color)]">
    <span className="text-[8px] uppercase tracking-wider text-[var(--text-accent)] font-semibold">
      PNG
    </span>
  </div>
</div>

// File attachment
<div className="flex items-center gap-2.5 p-2.5">
  {/* Icon Box */}
  <div className="w-10 h-10 bg-[#0f0f0f] border border-[var(--border-color)] flex items-center justify-center group-hover:border-[var(--text-accent)]/50">
    <FileIcon size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)]" />
  </div>
  
  {/* File Info */}
  <div className="flex flex-col">
    <span className="text-[11px] font-medium truncate">{name}</span>
    {/* Type Badge */}
    <span className="text-[8px] uppercase px-1.5 py-0.5 bg-[var(--text-accent)]/10 border border-[var(--text-accent)]/30 text-[var(--text-accent)]">
      PDF
    </span>
  </div>
</div>
```

### Input Area Pattern

The prompt input area follows consistent styling:

```tsx
{/* Input container */}
<div className="border border-[var(--border-color)] bg-[#1a1a1a] p-2.5 hover:border-[var(--text-accent)]/30 focus-within:border-[var(--text-accent)]/50 transition-all duration-150">
  <Textarea ... />
</div>

{/* Icon buttons (attachment, settings) */}
<button className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] flex items-center justify-center transition-all duration-150">
  <Icon size={16} />
</button>

{/* Send button - primary action */}
<button className={cn(
  "w-10 h-10 border transition-all duration-150",
  canSend
    ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-[#1a1a1a] hover:text-[var(--text-accent)]"
    : "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] opacity-50"
)}>
  <ArrowUp size={16} />
</button>

{/* Stop button - accent outline */}
<button className="w-10 h-10 border-2 border-[var(--text-accent)] bg-[#1a1a1a] text-[var(--text-accent)] hover:bg-[var(--text-accent)] hover:text-black">
  <Square size={12} fill="currentColor" />
</button>
```

### Summary: Do's and Don'ts

#### Do's
- Use `var(--text-accent)` for all highlighting
- Differentiate with opacity levels (100%, 75%, 50%, 30%)
- Use left border + background tint for selection
- Include descriptive text under labels
- Add visual indicators (bars, badges) for hierarchy
- Use appropriate icons from lucide-react
- Apply smooth transitions (150ms)

#### Don'ts
- Don't use multiple colors (blue, green, purple) for different items
- Don't use checkmarks for selection indication
- Don't skip the header section in dropdowns
- Don't use the same visual weight for all items
- Don't forget hover states on icon containers
- Don't use rounded corners (this is a sharp-edge design system)

## Performance Optimizations

1. **ThrottledMessageItem**: Throttles streaming updates to ~50ms
2. **FadeWrapper**: Smooth skeleton-to-content transitions
3. **Non-blocking DB writes**: Generation tracking doesn't block streaming
4. **Memoization**: Heavy components are memoized

## Contributing

1. Follow existing code patterns
2. Use the standardized UI components
3. Run `bun build` before committing
4. Keep components under 400 lines

## License

MIT
