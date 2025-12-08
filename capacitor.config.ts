import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.cracker.chat',
    appName: 'Cracker',
    webDir: 'out',
    server: {
        url: 'https://cracker.mom',
        cleartext: false
    },
    android: {
        allowMixedContent: true
    }
};

export default config;
