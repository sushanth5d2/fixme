/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
  },
  env: {
    node: true,
  },
};
