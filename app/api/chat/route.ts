import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const maxDuration = 60;

const openai = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:
    "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",
});

export async function POST(req: Request) {
  console.log("--- API Request Received ---");
  try {
    const { messages } = await req.json();
    console.log("Messages:", JSON.stringify(messages, null, 2));

    console.log("Starting streamText...");
    const result = await streamText({
      model: openai("openai/gpt-5.1-codex-mini"),
      messages,
      onFinish: (event) => {
        console.log("Stream finished. Tokens:", event.usage.completionTokens);
      },
    });
    console.log("streamText initiated successfully.");

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("API Route Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: error }),
      { status: 500 },
    );
  }
}
