module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-flow-strip-types',
      [
        '@babel/plugin-transform-typescript',
        {
          allowNamespaces: true,
          isTSX: true,
          allExtensions: true,
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
