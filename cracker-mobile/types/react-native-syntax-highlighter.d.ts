declare module 'react-native-syntax-highlighter' {
    import * as React from 'react';
    import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

    export interface SyntaxHighlighterProps {
        children: string;
        language?: string;
        style?: Record<string, Record<string, string>>;
        highlighter?: 'prism' | 'highlightjs' | 'hljs';
        fontFamily?: string;
        fontSize?: number;
        customStyle?: StyleProp<ViewStyle>;
        codeTagProps?: { style?: StyleProp<TextStyle> };
        [key: string]: unknown;
    }

    export default class SyntaxHighlighter extends React.PureComponent<SyntaxHighlighterProps> {}
}
