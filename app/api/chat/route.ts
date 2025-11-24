import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, createUIMessageStreamResponse } from "ai";

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

    const attachments: any[] = [];

    // Manual conversion to ensure compatibility with multimodal content and extract attachments
    const coreMessages = messages.map((m: { role: string; content: unknown; parts?: any[] }, index: number) => {
      const isLastMessage = index === messages.length - 1;
      
      // Handle multimodal content array (from useChat with attachments)
      if (Array.isArray(m.content)) {
        const newContent: any[] = [];
        
        m.content.forEach((part: any) => {
          if (part.type === 'image') {
            // Keep images as standard image content
            newContent.push({ type: 'image', image: part.image });
          } else if (part.type === 'file') {
             // Handle PDF
             if (part.mimeType === 'application/pdf') {
               if (isLastMessage) {
                 // Extract base64 data (remove data URL prefix if present)
                 const base64Data = part.data?.toString().includes(',') 
                    ? part.data.toString().split(',')[1] 
                    : part.data;
                 
                 if (base64Data) {
                   attachments.push({
                     type: 'application/pdf',
                     data: base64Data
                   });
                 }
                 // Don't add to content to avoid type errors
               }
             } else if (part.mimeType?.startsWith('image/')) {
                // Fallback for image files sent as 'file' type
                newContent.push({ type: 'image', image: part.data });
             } else {
                // Other files? Treat as text or ignore
                newContent.push({ type: 'text', text: `[File: ${part.name || 'unknown'}]` });
             }
          } else if (part.type === 'text') {
            newContent.push({ type: 'text', text: part.text });
          }
        });

        // If content is empty after extraction (e.g. only PDF), add empty text
        if (newContent.length === 0) {
            newContent.push({ type: 'text', text: ' ' });
        }

        return {
          role: m.role as "user" | "assistant" | "system" | "tool",
          content: newContent
        };
      }

      // Fallback for text-only content
      return {
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: (typeof m.content === 'string' ? m.content : "") || m.parts?.map((p: any) => p.text).join('') || ""
      };
    });

    const openrouterOptions: any = {
        reasoning: {
          effort: effort,
          exclude: false,
          enabled: true
        }
    };
    
    if (attachments.length > 0) {
        openrouterOptions.attachments = attachments;
    }

    const result = streamText({
      model: openrouter(modelId),
      // @ts-expect-error - Typing mismatch for multimodal messages
      messages: coreMessages,
      // Enable reasoning tokens for OpenRouter and pass attachments
      providerOptions: {
        openrouter: openrouterOptions
      },
      onFinish: () => {
        // console.log("Stream finished. Tokens:", event.usage.completionTokens);
        console.log("Stream finished.");
      },
    });
    console.log("streamText initiated successfully.");

    // Filter out invalid annotations that xAI/OpenRouter might send
    const stream = result.toUIMessageStream();
    const filteredStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            let cleanChunk = chunk;
            if (chunk && typeof chunk === 'object') {
              const c = chunk as any;
              // Remove raw OpenAI-style annotations if they leak through
              if (c.choices && Array.isArray(c.choices) && c.choices[0]?.delta?.annotations) {
                 const newChunk = { ...c };
                 const newChoices = [...newChunk.choices];
                 const newDelta = { ...newChoices[0].delta };
                 delete newDelta.annotations;
                 newChoices[0] = { ...newChoices[0], delta: newDelta };
                 newChunk.choices = newChoices;
                 cleanChunk = newChunk;
              }
              // Remove top-level annotations
              if ('annotations' in c) {
                const { annotations, ...rest } = c;
                cleanChunk = rest;
              }
            }
            controller.enqueue(cleanChunk);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    // Use the filtered stream
    return createUIMessageStreamResponse({ stream: filteredStream });
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
