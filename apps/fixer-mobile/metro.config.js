const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Module resolution: search project node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Block nested node_modules in expo to prevent duplicate React / React Native runtimes
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  new RegExp(
    path.resolve(monorepoRoot, 'node_modules/expo/node_modules')
      .replace(/[/\\]/g, '[/\\\\]') + '[/\\\\].*'
  ),
]);

// 4. Pin single instance of React, React Native, and key libraries
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@react-native/virtualized-lists': path.resolve(
    projectRoot,
    'node_modules/react-native/node_modules/@react-native/virtualized-lists'
  ),
};

module.exports = config;
