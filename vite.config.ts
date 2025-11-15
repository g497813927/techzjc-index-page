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
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || ''),
  },
  base: process.env.NODE_ENV === 'production' && process.env.SERVER_FULL === 'true'
    ? 'https://static.techzjc.com/index/'
    : '/',
})
