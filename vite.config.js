import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/nvidia-cert-nca-aiio-practice-test/',
  plugins: [react(), tailwindcss()],
})
