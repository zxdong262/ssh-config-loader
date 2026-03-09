import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../src/index.ts'),
      name: 'SshConfigLoader',
      formats: ['cjs'],
      fileName: 'index'
    },
    outDir: 'dist/cjs',
    emptyOutDir: true,
    rollupOptions: {
      external: ['node:fs', 'node:path', 'node:os', 'node:process'],
      output: {
        exports: 'named'
      }
    }
  },
  resolve: {
    conditions: ['require', 'node']
  }
})
