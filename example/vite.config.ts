import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import zip from 'vite-plugin-zip-pack';
import manifest from './manifest.config';

export default defineConfig(({ command }) => ({
  plugins: [
    crx({ manifest }),
    zip({ inDir: 'dist/prod', outDir: 'dist', outFileName: 'prod.zip' }),
  ],
  build: {
    outDir: command === 'build' ? 'dist/prod' : 'dist/dev',
    emptyOutDir: true,
    rollupOptions: { input: { welcome: 'src/welcome.html' } },
  },
}));
