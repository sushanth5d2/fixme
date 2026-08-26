const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

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

// 3. CRITICAL: Disable hierarchical lookup so Metro doesn't walk up from
//    each file's directory to find node_modules. Without this, packages in
//    root node_modules/ resolve react@18.3.1 while app code uses react@18.2.0,
//    causing "Invalid hook call" / duplicate React.
//    With this enabled, Metro ONLY searches nodeModulesPaths in order above.
config.resolver.disableHierarchicalLookup = true;

// 4. Block expo's nested node_modules entirely (they have React 19, RN 0.87)
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  new RegExp(
    path.resolve(monorepoRoot, 'node_modules/expo/node_modules')
      .replace(/[/\\]/g, '[/\\\\]') + '[/\\\\].*'
  ),
]);

// 5. Pin critical packages + their nested deps (needed because hierarchical
//    lookup is disabled, so nested node_modules won't be found automatically)
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@react-native/virtualized-lists': path.resolve(
    projectRoot,
    'node_modules/react-native/node_modules/@react-native/virtualized-lists'
  ),
};

// 6. API Proxy: proxy /api/* requests to 127.0.0.1:3000 so the mobile app
//    can reach the NestJS API through the Expo tunnel without needing to
//    resolve *.app.github.dev DNS (which some ISP DNS servers block).
const apiProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:3000',
  changeOrigin: true,
  logLevel: 'warn',
  onError: (err, req, res) => {
    console.warn('[Metro Proxy] Backend not reachable at 127.0.0.1:3000:', err.message);
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Backend API is currently starting up or offline. Please ensure NestJS API is running on port 3000.',
        },
      }));
    }
  },
});

config.server = config.server || {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  if (originalEnhanceMiddleware) {
    middleware = originalEnhanceMiddleware(middleware, server);
  }

  return (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      return apiProxy(req, res, next);
    }
    return middleware(req, res, next);
  };
};

module.exports = config;
