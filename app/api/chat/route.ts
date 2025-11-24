import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, createUIMessageStreamResponse } from "ai";

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: "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",
});

const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
type Role = "user" | "assistant" | "system" | "tool";

type TextContentPart = {
  type: "text";
  text?: string;
};

type ImageContentPart = {
  type: "image";
  image?: string;
  mediaType?: string;
  mimeType?: string;
};

type RawFileDescriptor = {
  filename?: string;
  file_data?: string;
  fileData?: string;
  mime_type?: string;
};

type FileContentPart = {
  type: "file";
  data?: string;
  mediaType?: string;
  mimeType?: string;
  filename?: string;
  name?: string;
  file?: RawFileDescriptor;
  file_data?: string;
  providerOptions?: Record<string, unknown>;
};

type ReasoningContentPart = {
  type: "reasoning";
  text?: string;
};

type MixedContentPart =
  | TextContentPart
  | ImageContentPart
  | FileContentPart
  | ReasoningContentPart
  | string
  | null
  | undefined;

type IncomingMessage = {
  role: Role | string;
  content?: MixedContentPart[] | string;
  parts?: Array<{ text?: string }>;
};

type NormalizedFilePart = {
  type: "file";
  data: string;
  mediaType: string;
  filename?: string;
  providerOptions?: Record<string, unknown>;
};

const toDataUrl = (rawData: MixedContentPart, mediaType: string): string | null => {
  if (!rawData || typeof rawData !== "string") return null;

  if (rawData.startsWith("data:")) return rawData;
  const trimmed = rawData.trim();
  if (base64Regex.test(trimmed)) {
    return `data:${mediaType || "application/octet-stream"};base64,${trimmed.replace(/\s/g, "")}`;
  }
  return trimmed;
};

const normalizeFilePart = (part: FileContentPart | string | null | undefined): NormalizedFilePart | null => {
  if (!part || typeof part === "string") return null;
  const mediaType = part.mediaType || part.mimeType || part.file?.mime_type || "application/octet-stream";
  const rawData = part.data || part.file?.file_data || part.file?.fileData || part.file_data;
  const filename = part.filename || part.name || part.file?.filename;
  const normalizedData = toDataUrl(rawData, mediaType);

  if (!normalizedData) return null;

  return {
    type: "file",
    data: normalizedData,
    mediaType,
    filename,
    providerOptions: part.providerOptions,
  };
};

type NormalizedContentPart = TextContentPart | ImageContentPart | NormalizedFilePart | ReasoningContentPart;

interface OpenRouterProviderOptions {
  reasoning: {
    effort: string;
    exclude: boolean;
    enabled: boolean;
  };
  plugins?: Array<{
    id: "file-parser";
    pdf: { engine: "pdf-text" | "mistral-ocr" | "native" };
  }>;
}

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

    let hasPdfAttachment = false;

    // Manual conversion to ensure compatibility with multimodal content
    const coreMessages = (messages as IncomingMessage[]).map((message) => {
      if (Array.isArray(message.content)) {
        const newContent: NormalizedContentPart[] = [];

        message.content.forEach((part) => {
          if (!part) return;

          if (typeof part === "string") {
            newContent.push({ type: "text", text: part });
            return;
          }

          if (part.type === "image" && part.image) {
            newContent.push({
              type: "image",
              image: part.image,
              mediaType: part.mediaType || part.mimeType,
            });
            return;
          }

          if (part.type === "file") {
            const normalizedFile = normalizeFilePart(part);
            if (normalizedFile) {
              if (normalizedFile.mediaType === "application/pdf") {
                hasPdfAttachment = true;
              }
              newContent.push(normalizedFile);
            } else {
              const fallbackLabel = part.name || part.filename || "attachment";
              newContent.push({ type: "text", text: `[Attachment unavailable: ${fallbackLabel}]` });
            }
            return;
          }

          if (part.type === "text") {
            newContent.push({ type: "text", text: part.text ?? "" });
            return;
          }

          if (part.type === "reasoning") {
            newContent.push({ type: "reasoning", text: part.text ?? "" });
          }
        });

        if (newContent.length === 0) {
          newContent.push({ type: "text", text: " " });
        }

        return {
          role: (message.role as Role) ?? "user",
          content: newContent,
        };
      }

      const fallbackContent = typeof message.content === "string"
        ? message.content
        : (Array.isArray(message.parts) ? message.parts.map((part) => part?.text || "").join("") : "");

      return {
        role: (message.role as Role) ?? "user",
        content: fallbackContent || "",
      };
    });

    const openrouterOptions: OpenRouterProviderOptions = {
        reasoning: {
          effort: effort,
          exclude: false,
          enabled: true
        }
    };

    if (hasPdfAttachment) {
      openrouterOptions.plugins = [
        {
          id: 'file-parser',
          pdf: { engine: 'pdf-text' }
        }
      ];
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
              type ChoiceDelta = { annotations?: unknown } & Record<string, unknown>;
              type Choice = { delta?: ChoiceDelta } & Record<string, unknown>;
              type ChunkWithAnnotations = { choices?: Choice[]; annotations?: unknown } & Record<string, unknown>;
              const c = chunk as ChunkWithAnnotations;
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
                const rest = { ...c } as Record<string, unknown>;
                delete rest.annotations;
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
