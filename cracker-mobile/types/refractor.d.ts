declare module 'refractor' {
    export interface RefractorNode {
        type: 'root' | 'element' | 'text';
        tagName?: string;
        properties?: { className?: string[]; [key: string]: unknown };
        children?: RefractorNode[];
        value?: string;
    }

    export function highlight(code: string, language: string): RefractorNode[] | RefractorNode;
    export function registered(language: string): boolean;
    export function listLanguages(): string[];
}
