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
    const modelId = model || "openai/gpt-oss-120b:exacto";
    const effort = reasoningEffort || "medium";

    // Validate messages is an array before converting
    if (!Array.isArray(messages)) {
        throw new Error("Messages must be an array");
    }

    console.log(`Starting streamText with ${modelId} (Effort: ${effort})...`);
    console.log("First message example:", JSON.stringify(messages[0], null, 2));
    
    // Manual conversion to ensure compatibility
    // @ts-ignore - Typing messages for streamText can be strict
    const coreMessages = messages.map((m: { role: string; content: unknown; parts?: { text: string }[] }) => ({
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: (typeof m.content === 'string' ? m.content : "") || m.parts?.map((p) => p.text).join('') || ""
    }));

    const result = streamText({
      model: openrouter(modelId),
      // @ts-expect-error - Typing mismatch for fallback messages
      messages: coreMessages,
      // Enable reasoning tokens for OpenRouter
      // @ts-ignore - providerMetadata might not be in the types yet or is experimental
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

    // Use the UI Message Stream response format which works with @ai-sdk/react useChat
    // @ts-ignore - toUIMessageStreamResponse might need type assertion or is experimental
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
