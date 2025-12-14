import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure we can access process.cwd() safely
  const cwd = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  
  // Vercel and Vite usually prefer variables starting with VITE_
  // We check all possibilities.
  const apiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';

  console.log(`[Vite Build] API Key detected: ${apiKey ? 'Yes (Length: ' + apiKey.length + ')' : 'No (Missing)'}`);

  return {
    plugins: [react()],
    define: {
      // Inject the key as a string literal globally
      // This is the fallback for code using process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})