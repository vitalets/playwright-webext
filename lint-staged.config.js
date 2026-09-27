export default {
  '*.{ts,tsx,mts}': [
    () => 'tsc --noEmit',
    'eslint --fix --no-warn-ignored',
    'prettier --ignore-unknown --write',
  ],
  '*.{js,mjs}': ['eslint --fix --no-warn-ignored', 'prettier --ignore-unknown --write'],
  '!(*.{js,mjs,ts,tsx,mts})': ['prettier --ignore-unknown --write'],
};
