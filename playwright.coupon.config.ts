import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'firstDeliveryCoupon.spec.ts', fullyParallel: false, workers: 1, timeout: 20000,
  use: { baseURL: 'http://127.0.0.1:5224', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npm run dev -- --mode test --host 127.0.0.1 --port 5224 --strictPort', url: 'http://127.0.0.1:5224', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://checkout-test.invalid', VITE_SUPABASE_ANON_KEY: 'fixture-public-key' } },
});
