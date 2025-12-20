/**
 * Profile Extractor - Automatically extracts user facts from messages
 * Uses Gemini Flash for fast, parallel extraction
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export interface ExtractedFact {
    fact: string;
    category: 'personal' | 'tech' | 'preferences' | 'other';
}

/**
 * Extract profile facts from a user message
 */
export async function extractFacts(message: string): Promise<ExtractedFact[]> {
    // Skip very short messages
    if (message.length < 5) {
        return [];
    }

    try {
        const { text } = await generateText({
            model: google("gemini-2.0-flash"),
            prompt: `You are a profile extraction system. Analyze this user message (in ANY language) and extract ONLY significant, lasting personal facts worth remembering for future conversations.

EXTRACT facts like:
- Age, birthday, zodiac sign
- Location, nationality, language preferences
- Occupation, school, field of study
- Programming languages, tools, frameworks, devices
- Vehicles, possessions
- Hobbies, interests, long-term goals
- Family members, pets, relationships
- Important life circumstances

DO NOT extract:
- Temporary states ("I'm tired", "I'm busy today")
- Opinions about the current topic being discussed
- Questions or requests
- Technical details of the current problem
- Greetings alone (but DO extract facts mentioned alongside greetings!)

IMPORTANT RULES:
1. MULTILINGUAL SUPPORT: The user may write in ANY language (English, Lithuanian, Russian, etc.). Always OUTPUT facts in English, but extract information from any language input.
   - "labas man 16" (Lithuanian: "hi I'm 16") → extract age fact
   - "привет мне 20 лет" (Russian: "hi I'm 20 years old") → extract age fact

2. CORRECT SPELLING: Fix typos and use proper spelling for place names, proper nouns. Examples:
   - "salcininkai" → "Šalčininkai"
   - "vilnus" → "Vilnius"

3. COMBINE related facts naturally. Instead of separate facts for name, age, location - combine them:
   - BAD: "My name is Max", "I'm 16", "I'm from Lithuania" (3 separate facts)
   - GOOD: "I'm Max, 16 years old, from Šalčininkai, Lithuania" (1 combined fact)

4. Write from USER'S perspective using "I" or "My" (in English).

5. All facts should use category "facts".

FORMAT: Return a JSON object with "facts" array. Each fact has "fact" (string) and "category" (always "facts").
If NO significant facts found, return: {"facts": []}

Example input: "labas man 16" (Lithuanian)
Example output: {"facts": [{"fact": "I'm 16 years old", "category": "facts"}]}

Example input: "hi im max im 16 from lithuania from salcininkai i have tesla model 3 2019"
Example output: {"facts": [{"fact": "I'm Max, 16 years old, from Šalčininkai, Lithuania", "category": "facts"}, {"fact": "I have a Tesla Model 3 (2019)", "category": "facts"}]}

Example input: "How do I fix this TypeScript error?"
Example output: {"facts": []}

User message: "${message.replace(/"/g, '\\"').substring(0, 2000)}"`,
            providerOptions: {
                google: {
                    generationConfig: {
                        maxOutputTokens: 500,
                        temperature: 0.1,
                    },
                },
            },
        });

        // Parse the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return [];
        }

        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.facts || !Array.isArray(parsed.facts)) {
            return [];
        }

        // Validate and clean facts
        return parsed.facts
            .filter((f: any) => f.fact && typeof f.fact === 'string' && f.fact.length > 5)
            .map((f: any) => ({
                fact: f.fact.trim(),
                category: ['personal', 'tech', 'preferences', 'other'].includes(f.category)
                    ? f.category
                    : 'other',
            }));

    } catch (error) {
        console.error('[Profile Extractor] Error:', error);
        return [];
    }
}

/**
 * Check if a new fact is a duplicate of existing facts
 * Uses smart keyword-based similarity
 */
export function isDuplicate(newFact: string, existingFacts: string[]): boolean {
    const normalize = (s: string) =>
        s.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);

    const newWords = new Set(normalize(newFact));

    for (const existing of existingFacts) {
        const existingWords = new Set(normalize(existing));

        // Count overlapping words
        let overlap = 0;
        for (const word of newWords) {
            if (existingWords.has(word)) {
                overlap++;
            }
        }

        // If more than 60% of words overlap, consider it a duplicate
        const similarity = overlap / Math.max(newWords.size, 1);
        if (similarity > 0.6) {
            return true;
        }

        // Also check for key value matches (e.g., "16 years" vs "16 years old")
        const newNumbers = newFact.match(/\d+/g) || [];
        const existNumbers = existing.match(/\d+/g) || [];
        if (newNumbers.length > 0 && existNumbers.length > 0) {
            // If same numbers and similar context, likely duplicate
            if ((newNumbers as string[]).some(n => (existNumbers as string[]).includes(n)) && similarity > 0.4) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Filter out duplicate facts from a list of new facts
 */
export function filterDuplicates(
    newFacts: ExtractedFact[],
    existingFacts: string[]
): ExtractedFact[] {
    return newFacts.filter(f => !isDuplicate(f.fact, existingFacts));
}
