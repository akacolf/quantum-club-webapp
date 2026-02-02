const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Ensure we find react-native in the right place
config.resolver.disableHierarchicalLookup = true;

// Enable package exports for better-auth
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { 
  input: "./global.css",
  configPath: path.resolve(projectRoot, "tailwind.config.js"),
});
