import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    main: './src/index.ts',
  },
  platform: 'neutral',
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  target: 'es2020',
  exports: true,
  external: [],
})
