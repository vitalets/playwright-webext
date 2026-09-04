export default {
  '*.{ts,tsx}': [() => 'tsc --noEmit', 'prettier --ignore-unknown --write'],
  '!(*.{ts,tsx})': ['prettier --ignore-unknown --write'],
};
