import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

const dir = import.meta.dirname;

// Bundles the interactive islands to a single ES module + one CSS file,
// emitted into book/assets/ so the Quarto site includes them site-wide.
export default defineConfig({
  root: dir,
  plugins: [svelte()],
  build: {
    outDir: resolve(dir, '../book/assets'),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(dir, 'src/main.js'),
      formats: ['es'],
      fileName: () => 'components.js'
    },
    rollupOptions: {
      output: { assetFileNames: 'components.[ext]' }
    }
  }
});
