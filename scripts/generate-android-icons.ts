import sharp from 'sharp';
import path from 'path';

// Icon sizes for Android mipmap folders
const sizes: Record<string, number> = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Full icon SVG with dark background (for legacy devices)
// Website ratio: Circle diameter is ~50% of box size. Corner radius is ~20%.
const createFullIconSvg = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" ry="${size * 0.2}" fill="#262626"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.25}" fill="#af8787"/>
</svg>
`;

// Foreground-only SVG for adaptive icons (circle only)
// Adaptive icon canvas is 1.5x the visual size (108dp vs 72dp).
// We want visual circle diameter to be 50% of visual size (0.5 * 72 = 36).
// Relative to canvas (108): 36/108 = 0.333 diameter => 0.166 radius
const createForegroundSvg = (fgSize: number) => `
<svg width="${fgSize}" height="${fgSize}" viewBox="0 0 ${fgSize} ${fgSize}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${fgSize / 2}" cy="${fgSize / 2}" r="${fgSize * 0.167}" fill="#af8787"/>
</svg>
`;

async function generateIcons() {
  const baseDir = 'android/app/src/main/res';

  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(baseDir, folder);

    // Legacy icons with full design (dark background + circle)
    const fullSvg = Buffer.from(createFullIconSvg(size));

    await sharp(fullSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    await sharp(fullSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Foreground for adaptive icons
    const foregroundSize = Math.round(size * 1.5);
    const foregroundSvg = Buffer.from(createForegroundSvg(foregroundSize));

    await sharp(foregroundSvg)
      .resize(foregroundSize, foregroundSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Generated ${size}x${size} icons in ${folder}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
