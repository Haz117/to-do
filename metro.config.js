// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para soportar web
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
