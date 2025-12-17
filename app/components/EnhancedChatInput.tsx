'use client';

import { useQuoteContext } from './QuoteContext';
import { QuoteButton } from './QuoteButton';
import { QuotedTextDisplay } from './QuotedTextDisplay';
import { ChatInput } from './ChatInput';
import type { AttachmentItem } from '@/app/hooks/useAttachments';
import type { ReasoningEffortLevel, LearningSubMode } from '@/app/hooks/usePersistedSettings';
import type { ChatMode } from '@/app/hooks/usePersistedSettings';

interface Quote {
  id: string;
  text: string;
  source: string;
}

interface EnhancedChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (quotes?: Quote[]) => void;
  onStop: () => void;
  isLoading: boolean;
  attachments: AttachmentItem[];
  hasPendingAttachments: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onRemoveAttachment: (id: string) => void;
  reasoningEffort: ReasoningEffortLevel;
  onReasoningEffortChange: (effort: ReasoningEffortLevel) => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  learningSubMode: LearningSubMode;
  onLearningSubModeChange: (mode: LearningSubMode) => void;
  disabled?: boolean;
  chatId?: string | null;
}

export function EnhancedChatInput({
  input,
  onInputChange,
  onSend,
  onStop,
  isLoading,
  attachments,
  hasPendingAttachments,
  onFileSelect,
  onPaste,
  onRemoveAttachment,
  reasoningEffort,
  onReasoningEffortChange,
  chatMode,
  onChatModeChange,
  learningSubMode,
  onLearningSubModeChange,
  disabled,
  chatId,
}: EnhancedChatInputProps) {
  const { quotes, clearQuotes } = useQuoteContext();

  const handleSend = () => {
    const quotesToSend = quotes.length > 0 ? [...quotes] : undefined;
    onSend(quotesToSend);
    if (quotesToSend) {
      clearQuotes();
    }
  };

  return (
    <div data-input-area="true" className="relative mobile-input-area">
      {/* Quote Button - appears when text is selected */}
      <QuoteButton />

      {/* Quoted Text Display - shows above the input */}
      <div className="max-w-[900px] mx-auto px-4">
        <QuotedTextDisplay onClearQuotes={clearQuotes} />
      </div>

      {/* Original Chat Input */}
      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSend={handleSend}
        onStop={onStop}
        isLoading={isLoading}
        attachments={attachments}
        hasPendingAttachments={hasPendingAttachments}
        onFileSelect={onFileSelect}
        onPaste={onPaste}
        onRemoveAttachment={onRemoveAttachment}
        reasoningEffort={reasoningEffort}
        onReasoningEffortChange={onReasoningEffortChange}
        chatMode={chatMode}
        onChatModeChange={onChatModeChange}
        learningSubMode={learningSubMode}
        onLearningSubModeChange={onLearningSubModeChange}
        disabled={disabled}
        chatId={chatId}
      />
    </div>
  );
}