import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/auth';

export default function Index() {
    const router = useRouter();
    const { user, isInitialized } = useAuthStore();

    useEffect(() => {
        if (isInitialized) {
            if (user) {
                // User is logged in, go to main
                router.replace('/(main)');
            } else {
                // No user, go to login (which has guest option)
                router.replace('/(auth)/login');
            }
        }
    }, [isInitialized, user]);

    return (
        <View style={{ flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#af8787" />
        </View>
    );
}
