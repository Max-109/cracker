import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToModelMessages, UIMessage } from "ai";

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages, model, reasoningEffort } = await req.json();
    const modelId = model || "x-ai/grok-4.1-fast";
    const effort = reasoningEffort || "medium";

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    // Convert UI messages to model messages using the SDK helper
    const modelMessages = convertToModelMessages(messages as UIMessage[]);

    const result = streamText({
      model: openrouter(modelId),
      messages: modelMessages,
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: effort,
            exclude: false,
          },
        },
      },
    });

    // Use the built-in UI message stream response
    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    const err = error as Error;
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err.message || String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
