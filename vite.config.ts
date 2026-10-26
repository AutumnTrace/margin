/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; local dev and preview use /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    // Mermaid ships big diagram chunks; they load only when a document has a diagram.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Keep the editor and the renderer in their own long-lived chunks.
        manualChunks(id) {
          // Language packs for fenced code stay out: @codemirror/language-data loads them on demand.
          if (/node_modules[/](codemirror|@codemirror[/](state|view|commands|language|search|autocomplete|lang-markdown|lang-html|lang-css|lang-javascript)|@lezer[/](common|highlight|lr|markdown|html|css|javascript))[/]/.test(id)) return 'editor'
          if (/node_modules[/](markdown-it|highlight\.js|katex|dompurify|@vscode)/.test(id)) return 'render'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
