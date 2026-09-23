import { defineConfig } from 'tsup'

// 产出 ESM + CJS + 类型声明，供任意环境集成
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'antd', '@ant-design/icons'],
  injectStyle: true,
})