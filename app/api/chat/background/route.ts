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
        messages: messages.map((m: { role: string; content: unknown }) => ({
          role: m.role,
          content: m.content,
        })),
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
