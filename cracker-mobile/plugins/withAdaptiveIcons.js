const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Create adaptive icon XML files and copy foreground images for dynamic icon variants
 * This fixes the white background issue by properly wrapping icon assets as Android adaptive icons
 */
function withAdaptiveIcons(config) {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const resDir = path.join(projectRoot, 'android/app/src/main/res');
            const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
            const foregroundSrcDir = path.join(projectRoot, 'assets/icons/foreground');

            // Ensure anydpi directory exists
            if (!fs.existsSync(anydpiDir)) {
                fs.mkdirSync(anydpiDir, { recursive: true });
            }

            // Icon variants
            const iconNames = [
                'icon_rose',
                'icon_sage',
                'icon_lavender',
                'icon_wheat',
                'icon_teal',
                'icon_mauve',
                'icon_coral'
            ];

            // Mipmap directories to copy foreground images to
            const mipmapDirs = [
                'mipmap-hdpi',
                'mipmap-mdpi',
                'mipmap-xhdpi',
                'mipmap-xxhdpi',
                'mipmap-xxxhdpi'
            ];

            for (const iconName of iconNames) {
                // Create adaptive icon XML
                const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/${iconName}_foreground"/>
</adaptive-icon>`;

                const xmlPath = path.join(anydpiDir, `${iconName}.xml`);
                fs.writeFileSync(xmlPath, xmlContent);
                console.log(`[withAdaptiveIcons] Created: ${iconName}.xml`);

                // Copy foreground image to each mipmap directory
                const srcImage = path.join(foregroundSrcDir, `${iconName}_foreground.png`);

                if (fs.existsSync(srcImage)) {
                    for (const mipmapDir of mipmapDirs) {
                        const destDir = path.join(resDir, mipmapDir);

                        // Ensure dest directory exists
                        if (!fs.existsSync(destDir)) {
                            fs.mkdirSync(destDir, { recursive: true });
                        }

                        const destPath = path.join(destDir, `${iconName}_foreground.png`);

                        try {
                            fs.copyFileSync(srcImage, destPath);
                            console.log(`[withAdaptiveIcons] Copied: ${mipmapDir}/${iconName}_foreground.png`);
                        } catch (e) {
                            console.error(`[withAdaptiveIcons] Failed to copy: ${e.message}`);
                        }
                    }
                } else {
                    console.warn(`[withAdaptiveIcons] Source not found: ${srcImage}`);
                }
            }

            console.log('[withAdaptiveIcons] Adaptive icons setup complete');
            return config;
        }
    ]);
}

module.exports = withAdaptiveIcons;
