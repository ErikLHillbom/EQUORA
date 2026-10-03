import { defineConfig, devices } from '@playwright/test'

// A fixed, unusual port so parallel worktrees never share a dev server. Override with E2E_PORT.
const PORT = Number(process.env.E2E_PORT ?? 5417)

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: false,
  reporter: 'list',
  // The first load decodes the model and builds 180 days of herd history; give it room.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    // Screenshots show the final drawing, never a half-drawn pencil circle.
    reducedMotion: 'reduce',
    colorScheme: 'light',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    // Test the production build, which is what a phone gets. Set E2E_DEV=1 to test the dev server.
    command: process.env.E2E_DEV
      ? `npm run dev -- --port ${PORT} --strictPort`
      : `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
