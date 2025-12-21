/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                accent: {
                    DEFAULT: '#af8787',
                    light: 'rgba(175, 135, 135, 0.125)',
                    medium: 'rgba(175, 135, 135, 0.5)',
                },
                main: {
                    bg: '#0f0f0f',
                    sidebar: '#141414',
                    input: '#1a1a1a',
                    code: '#0d0d0d',
                },
                border: {
                    DEFAULT: '#2a2a2a',
                    active: '#af8787',
                },
                text: {
                    primary: '#e5e5e5',
                    secondary: '#888888',
                },
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Menlo', 'monospace'],
            },
        },
    },
    plugins: [],
};
