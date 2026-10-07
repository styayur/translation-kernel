import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config(
  {
    ignores: [
      '.local/**',
      'dist/**',
      'node_modules/**',
      'release/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, chrome: 'readonly' },
    },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
);
