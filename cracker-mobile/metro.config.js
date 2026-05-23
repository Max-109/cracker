const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// The mobile app lives inside the Next.js repo, which also has its own
// node_modules with a different React version. Keep Metro from walking up and
// resolving parent React/React Native copies; duplicate React can blank-screen
// or crash native startup with invalid hook calls.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = withNativeWind(config, { input: "./global.css" });
