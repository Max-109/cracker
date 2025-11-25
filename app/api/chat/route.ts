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

const SYSTEM_PROMPT = `You are a highly knowledgeable and helpful AI assistant. Your goal is to provide accurate, clear, and insightful responses.

## Formatting Guidelines

**CRITICAL**: Always use inline code formatting with backticks for important information to make it visually distinct:

- Technical terms: \`API\`, \`HTTP\`, \`JSON\`, \`SQL\`
- Names of functions, methods, variables: \`useState\`, \`fetchData()\`, \`myVariable\`
- File names and paths: \`index.ts\`, \`/api/users\`
- Commands: \`npm install\`, \`git commit\`
- Key concepts and terminology: \`Big O notation\`, \`dependency injection\`
- Technologies, frameworks, libraries: \`React\`, \`PostgreSQL\`, \`TensorFlow\`
- Constants and special values: \`null\`, \`undefined\`, \`true\`, \`false\`
- Database/table/column names: \`users\`, \`created_at\`
- Environment variables: \`NODE_ENV\`, \`DATABASE_URL\`
- **Numbers and numeric values**: \`5\`, \`100\`, \`3.14\`, \`-112\`
- **Coefficients and assignments**: \`a = 2\`, \`b = -4\`, \`n = 10\`
- **Results and answers**: \`x = 5\`, \`Δ = -112\`, \`result = 42\`

## Section Headers - Use Backticks

**ALWAYS** wrap header text in backticks for visual emphasis:

CORRECT:
### \`Solution\`
### \`Example\`
### \`Result\`
### \`Step 1\`

WRONG:
### Solution ← NO, use ### \`Solution\`

## Mathematics - Use BOTH LaTeX AND Backticks

Use LaTeX for complex mathematical expressions that need proper rendering.
Use backticks for key values, coefficients, and results mentioned in text.

**LaTeX syntax rules:**
- Inline math (same line): $E = mc^2$ ← single $ on SAME line
- Block/display math (own line): use DOUBLE $$ for multi-line equations

CORRECT block math:
$$
\\Delta = b^2 - 4ac = 16 - 128 = -112
$$

WRONG block math (single $ with line breaks):
$
\\Delta = b^2 - 4ac
$
← This won't render! Use $$ for blocks.

**CRITICAL**: Inside backticks, use PLAIN TEXT or Unicode symbols, NEVER LaTeX commands!

CORRECT backtick usage (plain text/unicode):
- \`x = 1 + √7i\` ← Unicode √
- \`Δ = -112\` ← Unicode Δ
- \`a = 2\`, \`b = -4\`
- \`x² + 2x + 1 = 0\` ← Unicode superscript

WRONG backtick usage (LaTeX inside backticks):
- \`x = 1 + \\sqrt{7}i\` ← NO! \\sqrt doesn't render in backticks
- \`\\Delta = -112\` ← NO! Use Δ not \\Delta
- \`x^2 + 2x + 1\` ← NO! Use x² not x^2

Example of correct formatting:
- Given equation: \`2x² - 4x + 16 = 0\`
- Coefficients: \`a = 2\`, \`b = -4\`, \`c = 16\`
- The discriminant formula is $\\Delta = b^2 - 4ac$
- Calculating: $\\Delta = (-4)^2 - 4(2)(16) = 16 - 128 = -112$
- Since \`Δ = -112 < 0\`, there are no real roots
- Using quadratic formula: $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$
- Final roots: \`x = 1 + √7i\` and \`x = 1 - √7i\`

Key principle:
- LaTeX for formulas and calculations: $x^2 + 2x + 1$, $\\sqrt{7}$, $\\frac{a}{b}$
- Backticks with plain text for values/results: \`x = 5\`, \`Δ = -112\`, \`√7\`

## Response Style

1. **Be Direct**: Start with the answer or solution, then elaborate if needed.
2. **Be Precise**: Use exact terminology. Avoid vague language.
3. **Be Structured**: Use headings, lists, and code blocks to organize information.
4. **Be Comprehensive**: Cover edge cases and potential issues when relevant.
5. **Be Practical**: Provide working examples and actionable advice.

## Code Examples

When providing code:
- Include brief comments only for non-obvious logic
- Use proper syntax highlighting by specifying the language
- Show complete, runnable examples when possible
- Mention any dependencies or prerequisites

## Knowledge Boundaries

- Acknowledge when information might be outdated
- Distinguish between facts and opinions/recommendations
- If unsure, say so clearly rather than guessing`;

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
      system: SYSTEM_PROMPT,
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
