import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.output/**',
            '**/coverage/**',
            '**/generated/**',
            '**/.vite/**',
            'pnpm-lock.yaml',
            // Prisma-generated JS/TS lives under packages/database/node_modules
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },

    {
        files: ['apps/web/**/*.{ts,tsx,vue}'],
        languageOptions: {
            globals: { ...globals.browser },
        },
    },

    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                ecmaVersion: 2022,
                sourceType: 'module',
                extraFileExtensions: ['.vue'],
            },
            globals: { ...globals.browser },
        },
        rules: {
            'vue/multi-word-component-names': 'off',
        },
    },

    {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        languageOptions: {
            globals: { ...globals.node },
        },
    },
);
