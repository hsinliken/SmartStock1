import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure we can access process.cwd() safely
  const cwd = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  
  // Try to find the API Key in various common environment variable names
  // Vercel System Env vars might be in process.env, while .env files are in `env`
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY || '';

  // Log to build console (visible in Vercel logs) to help debugging
  console.log(`[Vite Build] API Key detected: ${apiKey ? 'Yes (Length: ' + apiKey.length + ')' : 'No (Missing)'}`);

  return {
    plugins: [react()],
    define: {
      // Inject the key as a string literal globally
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})