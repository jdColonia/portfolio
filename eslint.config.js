import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import astroParser from 'astro-eslint-parser';
import astroPlugin from 'eslint-plugin-astro';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import prettierConfig from 'eslint-config-prettier';

// JSDoc/TSDoc rules about the form of doc comments, shared by the TS/JS and Astro blocks.
// TypeScript carries the types, so tags never repeat them.
const jsdocFormatRules = {
  'jsdoc/no-types': 'error',
  'jsdoc/check-tag-names': ['error', { definedTags: ['file'] }],
  'jsdoc/check-param-names': 'error',
  'jsdoc/require-param-name': 'error',
  'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
  'jsdoc/check-alignment': 'error',
  'jsdoc/multiline-blocks': 'error',
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.output/**',
      '**/.astro/**',
      '**/node_modules/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      '.github/**',
      'v4/**',
      'porfolio.dev/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/triple-slash-reference': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Documentation comments follow JSDoc/TSDoc (Google TypeScript style): TypeScript carries the
    // types, so tags never repeat them, and only the exported API requires a doc comment.
    files: ['**/*.ts', '**/*.mjs'],
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: false,
            ClassDeclaration: true,
            MethodDefinition: false,
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'ExportNamedDeclaration > VariableDeclaration',
          ],
        },
      ],
      ...jsdocFormatRules,
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: {
      astro: astroPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      ...jsdocFormatRules,
    },
  },
  prettierConfig,
];
