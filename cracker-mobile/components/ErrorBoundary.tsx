import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../lib/design';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: error.stack || null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        this.setState({
            error,
            errorInfo: errorInfo.componentStack || null,
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={{
                    flex: 1,
                    backgroundColor: COLORS.bgMain,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        width: 60,
                        height: 60,
                        backgroundColor: '#ef444420',
                        borderWidth: 1,
                        borderColor: '#ef4444',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 20,
                    }}>
                        <Text style={{ fontSize: 24, color: '#ef4444' }}>!</Text>
                    </View>
                    <Text style={{
                        fontSize: 18,
                        fontWeight: '600',
                        color: COLORS.textPrimary,
                        marginBottom: 8,
                    }}>
                        Something went wrong
                    </Text>
                    <Text style={{
                        fontSize: 14,
                        color: COLORS.textSecondary,
                        textAlign: 'center',
                        marginBottom: 20,
                    }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </Text>

                    {/* Error details in scrollable view */}
                    <ScrollView style={{
                        maxHeight: 200,
                        width: '100%',
                        backgroundColor: '#141414',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        padding: 12,
                        marginBottom: 20,
                    }}>
                        <Text style={{
                            fontSize: 10,
                            color: COLORS.textSecondary,
                            fontFamily: FONTS.mono,
                        }}>
                            {this.state.error?.stack || this.state.errorInfo || 'No stack trace available'}
                        </Text>
                    </ScrollView>

                    <TouchableOpacity
                        onPress={this.handleReset}
                        style={{
                            backgroundColor: '#af8787',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                        }}
                    >
                        <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>
                            Try Again
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
