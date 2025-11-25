import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToModelMessages, UIMessage } from "ai";

export const maxDuration = 300;

// Custom fetch that filters out problematic file annotations from OpenRouter responses
function createFilteredFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    
    // Only filter streaming responses
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
      return response;
    }
    
    const filteredStream = filterSSEStream(response.body);
    
    return new Response(filteredStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

// Filter SSE stream to remove file annotations that cause validation errors
function filterSSEStream(inputStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const reader = inputStream.getReader();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              controller.enqueue(encoder.encode(processSSEBuffer(buffer)));
            }
            controller.close();
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages (separated by double newlines)
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          
          for (const part of parts) {
            const processed = processSSEBuffer(part + '\n\n');
            if (processed) {
              controller.enqueue(encoder.encode(processed));
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

function processSSEBuffer(text: string): string {
  // Process each line in the SSE message
  const lines = text.split('\n');
  const processedLines: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6); // Remove 'data: ' prefix
      if (jsonStr === '[DONE]') {
        processedLines.push(line);
        continue;
      }
      
      try {
        const parsed = JSON.parse(jsonStr);
        
        // Filter out file annotations from choices
        if (parsed.choices) {
          for (const choice of parsed.choices) {
            if (choice.delta?.annotations) {
              choice.delta.annotations = choice.delta.annotations.filter(
                (ann: { type: string }) => ann.type !== 'file'
              );
              if (choice.delta.annotations.length === 0) {
                delete choice.delta.annotations;
              }
            }
          }
        }
        
        processedLines.push('data: ' + JSON.stringify(parsed));
      } catch {
        // If parsing fails, pass through as-is
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  fetch: createFilteredFetch(),
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
