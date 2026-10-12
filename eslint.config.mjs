import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/.next/',
      'packages/art/',
      'assets/',
      'reference/',
      '**/next-env.d.ts',
      'apps/api/src/generated/',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.tsx', 'packages/reel/**/*.tsx'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
);
