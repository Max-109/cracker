/**
 * Envelope Encryption for Chat Messages
 * 
 * Architecture:
 * - KEK (Key Encryption Key): Stored in env var, encrypts DEKs
 * - DEK (Data Encryption Key): Per-chat, encrypts message content
 * 
 * Algorithm: AES-256-GCM (authenticated encryption)
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { getDb } from '@/db';
import { chatKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = 'enc:'; // Prefix to identify encrypted content

// Cache DEKs in memory to avoid repeated DB lookups
const dekCache = new Map<string, Buffer>();

/**
 * Get the KEK from environment variable
 */
function getKek(): Buffer {
    const kekHex = process.env.ENCRYPTION_KEK;
    if (!kekHex) {
        throw new Error('ENCRYPTION_KEK environment variable is not set');
    }
    if (kekHex.length !== 64) {
        throw new Error('ENCRYPTION_KEK must be a 32-byte (64 hex character) string');
    }
    return Buffer.from(kekHex, 'hex');
}

/**
 * Generate a new random DEK (256-bit)
 */
export function generateDek(): Buffer {
    return randomBytes(32);
}

/**
 * Encrypt a DEK using the KEK
 */
export function encryptDek(dek: Buffer, kek: Buffer): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, kek, iv);

    const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: base64(iv + authTag + encrypted)
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a DEK using the KEK
 */
export function decryptDek(encryptedDek: string, kek: Buffer): Buffer {
    const data = Buffer.from(encryptedDek, 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, kek, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Encrypt content (any JSON-serializable value)
 */
export function encryptContent(content: unknown, dek: Buffer): string {
    const plaintext = JSON.stringify(content);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, dek, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // Format: "enc:" + base64(iv + authTag + encrypted)
    return ENCRYPTED_PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt content back to original JSON value
 * Returns the original value if content is not encrypted (for lazy migration)
 */
export function decryptContent(content: unknown, dek: Buffer): unknown {
    // If content is not a string starting with our prefix, it's plaintext (legacy)
    if (typeof content !== 'string' || !content.startsWith(ENCRYPTED_PREFIX)) {
        return content;
    }

    const data = Buffer.from(content.slice(ENCRYPTED_PREFIX.length), 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]).toString('utf8');

    return JSON.parse(plaintext);
}

/**
 * Get or create a DEK for a chat
 * Uses in-memory cache for performance
 */
export async function getOrCreateChatDek(chatId: string): Promise<Buffer> {
    // Check cache first
    const cached = dekCache.get(chatId);
    if (cached) {
        return cached;
    }

    const db = getDb();
    const kek = getKek();

    // Try to get existing DEK
    const existing = await db
        .select()
        .from(chatKeys)
        .where(eq(chatKeys.chatId, chatId))
        .limit(1);

    if (existing.length > 0) {
        const dek = decryptDek(existing[0].encryptedDek, kek);
        dekCache.set(chatId, dek);
        return dek;
    }

    // Create new DEK for this chat
    const newDek = generateDek();
    const encryptedDek = encryptDek(newDek, kek);

    await db.insert(chatKeys).values({
        chatId,
        encryptedDek,
    });

    dekCache.set(chatId, newDek);
    return newDek;
}

/**
 * Get DEK for a chat (returns null if not found)
 * Used for reading messages - if no DEK exists, messages are plaintext
 */
export async function getChatDek(chatId: string): Promise<Buffer | null> {
    // Check cache first
    const cached = dekCache.get(chatId);
    if (cached) {
        return cached;
    }

    const db = getDb();
    const kek = getKek();

    const existing = await db
        .select()
        .from(chatKeys)
        .where(eq(chatKeys.chatId, chatId))
        .limit(1);

    if (existing.length === 0) {
        return null;
    }

    const dek = decryptDek(existing[0].encryptedDek, kek);
    dekCache.set(chatId, dek);
    return dek;
}

/**
 * Clear DEK cache (useful for testing or key rotation)
 */
export function clearDekCache(): void {
    dekCache.clear();
}

/**
 * Encrypt a chat title
 * Uses the same DEK as messages for consistency
 */
export function encryptTitle(title: string | null, dek: Buffer): string | null {
    if (!title) return null;
    return encryptContent(title, dek) as string;
}

/**
 * Decrypt a chat title
 * Returns the original title if not encrypted (for lazy migration)
 */
export function decryptTitle(title: string | null, dek: Buffer | null): string | null {
    if (!title) return null;
    if (!dek) return title; // No DEK means legacy plaintext

    // If title doesn't start with prefix, it's plaintext
    if (!title.startsWith(ENCRYPTED_PREFIX)) {
        return title;
    }

    return decryptContent(title, dek) as string;
}
