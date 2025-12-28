#!/bin/bash
# Post-prebuild script to copy foreground images for adaptive icons
# This must run AFTER expo prebuild because expo's asset pipeline can overwrite plugin output

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RES_DIR="$PROJECT_ROOT/android/app/src/main/res"
FOREGROUND_SRC="$PROJECT_ROOT/assets/icons/foreground"

echo "[post-prebuild] Copying adaptive icon foreground images..."

# Check if source directory exists
if [ ! -d "$FOREGROUND_SRC" ]; then
    echo "[post-prebuild] ERROR: Foreground source directory not found: $FOREGROUND_SRC"
    exit 1
fi

# Icon names
ICONS=("rose" "sage" "lavender" "wheat" "teal" "mauve" "coral")

# Mipmap directories
MIPMAPS=("mipmap-hdpi" "mipmap-mdpi" "mipmap-xhdpi" "mipmap-xxhdpi" "mipmap-xxxhdpi")

for icon in "${ICONS[@]}"; do
    src_file="$FOREGROUND_SRC/icon_${icon}_foreground.png"
    
    if [ ! -f "$src_file" ]; then
        echo "[post-prebuild] WARNING: Source file not found: $src_file"
        continue
    fi
    
    for mipmap in "${MIPMAPS[@]}"; do
        dest_dir="$RES_DIR/$mipmap"
        dest_file="$dest_dir/icon_${icon}_foreground.png"
        
        if [ -d "$dest_dir" ]; then
            cp "$src_file" "$dest_file"
            echo "[post-prebuild] Copied: $mipmap/icon_${icon}_foreground.png"
        else
            echo "[post-prebuild] WARNING: Directory not found: $dest_dir"
        fi
    done
done

echo "[post-prebuild] Done! Foreground images copied successfully."
