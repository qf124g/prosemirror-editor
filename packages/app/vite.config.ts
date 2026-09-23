import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// 演示应用直接以源码方式引入 editor，方便调试与热更新
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@full-editor/editor': fileURLToPath(new URL('../editor/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})