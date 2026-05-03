import js from '@eslint/js';

const browserGlobals = {
  crypto: 'readonly',
  document: 'readonly',
  window: 'readonly',
};

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
};

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    files: ['build.js', '*.config.js'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
];
