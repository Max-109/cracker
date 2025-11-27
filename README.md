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
| **OpenRouter** | Multi-model AI provider |
| **Google AI** | Gemini models with native support |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- PostgreSQL database (we use [Neon](https://neon.tech/))
- OpenRouter API key and/or Google AI API key

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
OPENROUTER_API_KEY=sk-or-...
GOOGLE_GENERATIVE_AI_API_KEY=...
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
│   └── chat-types.ts           # TypeScript types
└── drizzle/                    # Database migrations
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

### Multi-Model Support
- **OpenRouter**: Access to 100+ models (GPT-4, Claude, Llama, etc.)
- **Google AI**: Native Gemini support with thinking/reasoning
- **Custom Models**: Enter any OpenRouter model ID

### Reasoning & Thinking
- Collapsible reasoning blocks for models like DeepSeek R1, Gemini
- Thinking effort levels: Low, Medium, High
- Structured persistence of reasoning in database

### File Attachments
- Drag & drop or click to upload
- Paste images from clipboard
- Progress tracking with circular indicator
- Support for images and documents

### Real-time Streaming
- Token-by-token streaming display
- Tokens per second (TPS) metrics
- Background generation resume support

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

// Active generations (for resume support)
activeGenerations: {
  id: uuid
  chatId: uuid
  modelId: text
  status: text ('streaming' | 'completed' | 'failed')
  partialText: text
  partialReasoning: text
  ...
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
