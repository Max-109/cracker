import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthContext";
import { SettingsProvider } from "./components/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cracker",
  description: "AI-powered chat interface",
};

// Inline script to apply accent color from localStorage immediately (before React hydrates)
// This ensures login/register pages have the correct accent color
const accentColorScript = `
(function() {
  try {
    var color = localStorage.getItem('CRACKER_ACCENT_COLOR') || '#af8787';
    var root = document.documentElement;
    root.style.setProperty('--text-accent', color);
    root.style.setProperty('--border-active', color);
    
    // Parse hex to RGB then to HSL for derived colors
    var hex = color.replace('#', '');
    var r = parseInt(hex.substr(0, 2), 16) / 255;
    var g = parseInt(hex.substr(2, 2), 16) / 255;
    var b = parseInt(hex.substr(4, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    root.style.setProperty('--accent-h', Math.round(h * 360));
    root.style.setProperty('--accent-s', Math.round(s * 100) + '%');
    root.style.setProperty('--accent-l', Math.round(l * 100) + '%');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentColorScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
