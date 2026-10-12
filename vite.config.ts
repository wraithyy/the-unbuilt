/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the project under /<repo>/; other hosts use the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
})
