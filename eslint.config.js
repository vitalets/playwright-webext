import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/', 'website/', 'test-results/', 'playwright-report/', 'test/data/']),
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
