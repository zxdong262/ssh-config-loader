import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../src/index.ts'),
      name: 'SshConfigLoader',
      formats: ['es'],
      fileName: 'index'
    },
    outDir: 'dist/esm',
    emptyOutDir: true,
    rollupOptions: {
      external: ['node:fs', 'node:path', 'node:os', 'node:process']
    }
  },
  resolve: {
    conditions: ['import', 'module']
  }
})
