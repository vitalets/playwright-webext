import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

rmSync(new URL('../dist', import.meta.url), {
  force: true,
  recursive: true,
});

const tscPath = fileURLToPath(
  new URL('../node_modules/typescript/bin/tsc', import.meta.url),
);
const result = spawnSync(process.execPath, [tscPath, '-p', 'tsconfig.json'], {
  stdio: 'inherit',
});

process.exitCode = result.status ?? 1;
