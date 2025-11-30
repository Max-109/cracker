import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/db";
import { activeGenerations } from "@/db/schema";
import { randomUUID } from "crypto";

export const maxDuration = 30;

// POST - Start a background generation
// This triggers an Inngest event that runs the generation independently
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      model,
      reasoningEffort,
      chatId,
      responseLength,
      userName,
      userGender,
      learningMode,
      customInstructions,
    } = body;

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const modelId = model || "google/gemini-3-pro-preview";
    const effort = reasoningEffort || "medium";
    const respLength = typeof responseLength === 'number' ? responseLength : 50;
    const uName = userName || '';
    const uGender = userGender || 'not-specified';
    const isLearningMode = learningMode === true;
    const userCustomInstructions = customInstructions || '';

    // Create the generation record
    const generationId = randomUUID();
    
    await db.insert(activeGenerations).values({
      id: generationId,
      chatId,
      modelId,
      reasoningEffort: effort,
      status: 'pending', // Will be set to 'streaming' when Inngest picks it up
    });

    console.log(`[BackgroundChat] Created generation ${generationId} for chat ${chatId}`);

    // Trigger the Inngest event
    // Filter out generated-image parts from message history to avoid exceeding Inngest's 3MB limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.map((m: { role: string; content: unknown }) => {
      if (Array.isArray(m.content)) {
        // Filter out generated-image parts (they can be 1MB+ each)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filteredContent = (m.content as any[]).filter((part: any) => {
          if (part.type === 'generated-image') {
            console.log(`[BackgroundChat] Filtering out generated-image from history`);
            return false;
          }
          return true;
        });
        return { role: m.role, content: filteredContent };
      }
      return { role: m.role, content: m.content };
    });

    await inngest.send({
      name: "chat/message.sent",
      data: {
        chatId,
        generationId,
        modelId,
        reasoningEffort: effort,
        responseLength: respLength,
        userName: uName,
        userGender: uGender,
        learningMode: isLearningMode,
        customInstructions: userCustomInstructions,
        messages: filteredMessages,
      },
    });

    console.log(`[BackgroundChat] Triggered Inngest event for generation ${generationId}`);

    return NextResponse.json({
      success: true,
      generationId,
      chatId,
      message: "Background generation started",
    });

  } catch (error) {
    console.error("[BackgroundChat] Error:", error);
    return NextResponse.json(
      { error: "Failed to start background generation" },
      { status: 500 }
    );
  }
}
