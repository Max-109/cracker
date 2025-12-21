import { Stack } from 'expo-router';

export default function MainLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0f0f0f' },
                animation: 'fade',
            }}
        />
    );
}
