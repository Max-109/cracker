import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Preset colors from the app (SettingsDialog.tsx)
const PRESET_COLORS: Record<string, string> = {
  'rose': '#af8787',
  'sage': '#87af87',
  'lavender': '#8787af',
  'wheat': '#afaf87',
  'teal': '#87afaf',
  'mauve': '#af87af',
  'coral': '#ff6b6b',
};

// Icon sizes for Android mipmap folders
const sizes: Record<string, number> = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Full icon SVG with dark background (for legacy devices)
const createFullIconSvg = (size: number, color: string) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" ry="${size * 0.2}" fill="#262626"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.25}" fill="${color}"/>
</svg>
`;

// Foreground-only SVG for adaptive icons
const createForegroundSvg = (fgSize: number, color: string) => `
<svg width="${fgSize}" height="${fgSize}" viewBox="0 0 ${fgSize} ${fgSize}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${fgSize / 2}" cy="${fgSize / 2}" r="${fgSize * 0.167}" fill="${color}"/>
</svg>
`;

async function generateIconsForColor(colorName: string, colorHex: string) {
  const baseDir = 'android/app/src/main/res';

  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(baseDir, folder);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Legacy icons
    const fullSvg = Buffer.from(createFullIconSvg(size, colorHex));

    await sharp(fullSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, `ic_launcher_${colorName}.png`));

    await sharp(fullSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, `ic_launcher_${colorName}_round.png`));

    // Foreground for adaptive icons
    const foregroundSize = Math.round(size * 1.5);
    const foregroundSvg = Buffer.from(createForegroundSvg(foregroundSize, colorHex));

    await sharp(foregroundSvg)
      .resize(foregroundSize, foregroundSize)
      .png()
      .toFile(path.join(dir, `ic_launcher_${colorName}_foreground.png`));
  }

  console.log(`Generated icons for ${colorName} (${colorHex})`);
}

async function generateAllIcons() {
  // Generate default icons (rose)
  const defaultColor = PRESET_COLORS['rose'];
  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join('android/app/src/main/res', folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fullSvg = Buffer.from(createFullIconSvg(size, defaultColor));
    await sharp(fullSvg).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(fullSvg).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));

    const foregroundSize = Math.round(size * 1.5);
    const foregroundSvg = Buffer.from(createForegroundSvg(foregroundSize, defaultColor));
    await sharp(foregroundSvg).resize(foregroundSize, foregroundSize).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  console.log('Generated default icons');

  // Generate icons for each preset color
  for (const [colorName, colorHex] of Object.entries(PRESET_COLORS)) {
    await generateIconsForColor(colorName, colorHex);
  }

  console.log('\nAll icon sets generated successfully!');
  console.log('Colors:', Object.keys(PRESET_COLORS).join(', '));
}

generateAllIcons().catch(console.error);
