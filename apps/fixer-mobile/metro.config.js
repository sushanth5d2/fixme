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

// 3. Block the duplicate react-native inside expo/node_modules to prevent
//    Metro from ever resolving or transforming it. This eliminates the
//    "} as ReactNativePublicAPI" syntax error permanently.
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  // Block expo's nested react-native (v0.87.0) — we use the project's v0.74.5
  new RegExp(
    path.resolve(monorepoRoot, 'node_modules/expo/node_modules/react-native')
      .replace(/[/\\]/g, '[/\\\\]') + '[/\\\\].*'
  ),
]);

// 4. Pin critical packages so Metro always resolves them from the project
config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react': path.resolve(projectRoot, 'node_modules/react'),
  '@react-native/virtualized-lists': path.resolve(
    projectRoot,
    'node_modules/react-native/node_modules/@react-native/virtualized-lists'
  ),
};

// 5. Disable hierarchical lookup to prevent Metro from finding modules
//    in unexpected nested node_modules directories
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
