import { Inngest } from "inngest";

// Create the Inngest client
// This is used to send events and define functions
export const inngest = new Inngest({
  id: "cracker-chat",
  // Event schemas for type safety
});

// Event types for our chat application
export type ChatMessageEvent = {
  name: "chat/message.sent";
  data: {
    chatId: string;
    generationId: string;
    modelId: string;
    reasoningEffort: string;
    responseLength: number;
    userName: string;
    userGender: string;
    learningMode: boolean;
    customInstructions: string;
    // The messages array serialized
    messages: Array<{
      role: string;
      content: unknown;
    }>;
  };
};

export type DeepSearchEvent = {
  name: "deep-search/start";
  data: {
    chatId: string;
    generationId: string;
    query: string;
    clarifyAnswers?: Array<{ q: string; a: string }>;
  };
};
