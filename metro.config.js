const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude Node build tools from the React Native bundle
config.resolver.blockList = [
  /build\.js$/,
  /node_modules\/@babel\/.*/,
  /node_modules\/esbuild\/.*/,
];

module.exports = config;