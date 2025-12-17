import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthContext";
import { SettingsProvider } from "./components/SettingsContext";
import { registerServiceWorker } from '@/lib/service-worker';

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
    
    // Update favicon with accent color - remove all existing and create fresh
    var svg = '<svg width="32" height="32" viewBox="0 0 291 291" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="3.252" y="3.252" width="283.465" height="283.465" rx="60" ry="60" fill="#262626" stroke="#7c7c7c" stroke-width="6.5"/>' +
      '<circle cx="144.985" cy="144.985" r="70.866" fill="' + color + '" stroke="#7c7c7c" stroke-width="6.5"/>' +
      '</svg>';
    var blob = new Blob([svg], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var existingLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    existingLinks.forEach(function(l) { l.remove(); });
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = url;
    document.head.appendChild(link);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Register service worker for offline caching and performance
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentColorScript }} />
      </head>
      <body
        className="antialiased"
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
