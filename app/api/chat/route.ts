import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: "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",
});

export async function POST(req: Request) {
  console.log("--- API Request Received ---");
  try {
    const { messages, model, reasoningEffort } = await req.json();
    const modelId = model || "x-ai/grok-4.1-fast";
    const effort = reasoningEffort || "medium";

    // Validate messages is an array before converting
    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    console.log(`Starting streamText with ${modelId} (Effort: ${effort})...`);

    // Manual conversion to ensure compatibility with multimodal content
    const coreMessages = messages.map((m: { role: string; content: unknown; parts?: { type: string; text?: string; image?: string; data?: string; mimeType?: string }[] }) => {
      // Handle multimodal content array (from useChat with attachments)
      if (Array.isArray(m.content)) {
        return {
          role: m.role as "user" | "assistant" | "system" | "tool",
          content: m.content.map(part => {
            if (part.type === 'image') {
              return { type: 'image', image: part.image };
            }
            if (part.type === 'file') {
              // FIX: 'file' type is not standard in CoreMessage.
              // Map to 'image' for PDFs/Images as many providers handle them this way.
              // If it's text, we should have handled it on client, but if it comes here as file:
              if (part.mimeType?.startsWith('image/') || part.mimeType === 'application/pdf') {
                return { type: 'image', image: part.data, mimeType: part.mimeType };
              }
              // Fallback: Try sending as image anyway or text?
              // Let's try sending as image with the mimeType, as that's the most likely way to pass binary data.
              return { type: 'image', image: part.data, mimeType: part.mimeType };
            }
            return { type: 'text', text: part.text };
          })
        };
      }

      // Fallback for text-only content
      return {
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: (typeof m.content === 'string' ? m.content : "") || m.parts?.map((p) => p.text).join('') || ""
      };
    });

    const result = streamText({
      model: openrouter(modelId),
      // @ts-expect-error - Typing mismatch for multimodal messages
      messages: coreMessages,
      // Enable reasoning tokens for OpenRouter
      experimental_providerMetadata: {
        openrouter: {
          reasoning: {
            effort: effort,
            exclude: false,
            enabled: true
          }
        }
      },
      onFinish: () => {
        // console.log("Stream finished. Tokens:", event.usage.completionTokens);
        console.log("Stream finished.");
      },
    });
    console.log("streamText initiated successfully.");

    // Use the Data Stream response format which is more flexible and handles annotations better
    // Revert to UIMessageStreamResponse for now as toDataStreamResponse seems unavailable in this environment
    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    const err = error as Error;
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err.message || String(error),
        stack: err.stack
      }),
      { status: 500 },
    );
  }
}
