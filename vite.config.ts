import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(
      execSync('git rev-parse --short HEAD').toString().trim()
    ),
    __COMPILE_TIME__: JSON.stringify(
      new Date().toISOString()
    ),
  },
  base: process.env.NODE_ENV === 'production'
    ? 'https://static.techzjc.com/index/'
    : '/',
})
