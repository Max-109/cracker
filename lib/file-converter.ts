/**
 * File Converter Utility
 * 
 * Converts unsupported file types to text format for Gemini/Vertex AI.
 * - Word docs (.docx): Extract text using mammoth
 * - HTML files: Strip tags and extract plain text
 * - Other unsupported: Convert to plain text
 */

import mammoth from 'mammoth';

// MIME types that Gemini/Vertex AI supports directly
const SUPPORTED_MIME_TYPES = new Set([
    // Images
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    // PDF
    'application/pdf',
    // Text types
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/xml',
    'text/xml',
]);

// MIME types that we can convert to text
const CONVERTIBLE_MIME_TYPES: Record<string, string> = {
    // Word documents - convert to text
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    // HTML - strip tags
    'text/html': 'html',
    // Excel - basic text extraction
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    // PowerPoint
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
    // Rich text
    'application/rtf': 'rtf',
    'text/rtf': 'rtf',
};

export interface ConvertedFile {
    content: string;
    originalName: string;
    originalMimeType: string;
    convertedMimeType: string;
    wasConverted: boolean;
}

/**
 * Check if a MIME type is directly supported by Gemini
 */
export function isSupportedMimeType(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.has(mimeType);
}

/**
 * Check if a MIME type can be converted to text
 */
export function isConvertibleMimeType(mimeType: string): boolean {
    return mimeType in CONVERTIBLE_MIME_TYPES;
}

/**
 * Extract text from a Word document (.docx)
 */
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('Failed to extract text from DOCX:', error);
        throw new Error('Failed to extract text from Word document');
    }
}

/**
 * Extract text from HTML content
 */
function extractTextFromHtml(html: string): string {
    // Remove script and style content
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Replace common block elements with newlines
    text = text
        .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
        .replace(/<\/?(td|th)[^>]*>/gi, '\t');

    // Remove all remaining tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));

    // Clean up whitespace
    text = text
        .replace(/\t+/g, '\t')
        .replace(/[ ]+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

    return text;
}

/**
 * Convert a file to a supported format (text)
 */
export async function convertFile(file: File): Promise<ConvertedFile> {
    const mimeType = file.type;

    // If already supported, return as-is
    if (isSupportedMimeType(mimeType)) {
        return {
            content: '',
            originalName: file.name,
            originalMimeType: mimeType,
            convertedMimeType: mimeType,
            wasConverted: false,
        };
    }

    const fileType = CONVERTIBLE_MIME_TYPES[mimeType];
    let content: string;

    switch (fileType) {
        case 'docx': {
            // Extract text from Word document
            const arrayBuffer = await file.arrayBuffer();
            content = await extractTextFromDocx(arrayBuffer);
            content = `[Content extracted from: ${file.name}]\n\n${content}`;
            break;
        }

        case 'doc': {
            // Legacy .doc files are harder to parse without server-side tools
            content = `[Unable to extract text from legacy .doc file: ${file.name}]\n\nPlease convert to .docx or PDF format for best results.`;
            break;
        }

        case 'html': {
            // Strip HTML tags and extract text
            const htmlContent = await file.text();
            content = extractTextFromHtml(htmlContent);
            content = `[Content extracted from: ${file.name}]\n\n${content}`;
            break;
        }

        case 'xlsx':
        case 'xls': {
            content = `[Excel file: ${file.name}]\n\nFor best results with spreadsheet data, please export as CSV or copy the content as text.`;
            break;
        }

        case 'pptx':
        case 'ppt': {
            content = `[PowerPoint file: ${file.name}]\n\nFor best results with presentation content, please export as PDF.`;
            break;
        }

        case 'rtf': {
            // Basic RTF text extraction
            const rawContent = await file.text();
            content = rawContent
                .replace(/\\[a-z]+[0-9]*\s?/gi, '')
                .replace(/[{}]/g, '')
                .replace(/\n+/g, '\n')
                .trim();
            content = `[Content extracted from: ${file.name}]\n\n${content}`;
            break;
        }

        default: {
            // Try to read as plain text
            try {
                content = await file.text();
                content = `[Content from: ${file.name}]\n\n${content}`;
            } catch {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }
        }
    }

    return {
        content,
        originalName: file.name,
        originalMimeType: mimeType,
        convertedMimeType: 'text/plain',
        wasConverted: true,
    };
}

/**
 * Create a text data URL from content
 */
export function createTextDataUrl(content: string): string {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    return `data:text/plain;base64,${base64}`;
}
