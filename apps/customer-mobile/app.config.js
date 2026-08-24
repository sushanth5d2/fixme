/**
 * Expo config — runs on the dev server (Codespace), NOT on the phone.
 * Reads CODESPACE_NAME env-var so the mobile app automatically discovers
 * the correct API URL for every new Codespace without any manual changes.
 */

function getApiUrl() {
  const codespaceName = process.env.CODESPACE_NAME;
  const domain =
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';

  if (codespaceName) {
    // Running inside a GitHub Codespace
    return `https://${codespaceName}-3000.${domain}/api/v1`;
  }

  // Local development (emulator or physical device on same Wi-Fi)
  return 'http://10.0.2.2:3000/api/v1';
}

module.exports = {
  expo: {
    name: 'FixMe Customer',
    slug: 'fixme-customer',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: 'fixme-customer',
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fixme.customer',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
      },
      package: 'com.fixme.customer',
    },
    plugins: [],
    experiments: {
      tsconfigPaths: true,
    },
    extra: {
      apiUrl: getApiUrl(),
    },
  },
};
