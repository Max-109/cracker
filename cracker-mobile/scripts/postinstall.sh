#!/bin/bash
# Postinstall script to patch react-native-css-interop for Reanimated 3 compatibility
# This comments out the worklets plugin that requires Reanimated 4+

patch_file="node_modules/react-native-css-interop/babel.js"

if [ -f "$patch_file" ]; then
    # Check if already patched
    if grep -q "// \"react-native-worklets/plugin\"" "$patch_file"; then
        echo "react-native-css-interop already patched"
    else
        # Comment out the worklets plugin
        sed -i '' 's/"react-native-worklets\/plugin"/\/\/ "react-native-worklets\/plugin"/g' "$patch_file"
        echo "Patched react-native-css-interop for Reanimated 3"
    fi
fi
