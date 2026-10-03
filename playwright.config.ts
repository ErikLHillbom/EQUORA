import { defineConfig, devices } from '@playwright/test'

// A fixed, unusual port so parallel worktrees never share a dev server. Override with E2E_PORT.
const PORT = Number(process.env.E2E_PORT ?? 5417)

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: false,
  reporter: 'list',
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
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
