import { defineConfig, devices } from '@playwright/test'

const PORTA_API = Number(process.env.E2E_PORTA_API ?? 3334)
const PORTA_WEB = Number(process.env.E2E_PORTA_WEB ?? 5174)
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgres://hastyhelp:hastyhelp@localhost:5433/hastyhelp_e2e'

/**
 * E2E contra o sistema real: front (Vite) + API (Express) + PostgreSQL (docker compose up -d db).
 * Cada teste cria os próprios dados (e-mails únicos), então não depende de ordem nem de seed.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORTA_WEB}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 810 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      command: 'npm run start --prefix ../backend',
      url: `http://localhost:${PORTA_API}/api/health`,
      env: { PORT: String(PORTA_API), DATABASE_URL, JWT_SECRET: 'e2e', SEED: 'false', APP_URL: `http://localhost:${PORTA_WEB}`, EXPOR_CAIXA_DE_SAIDA: 'true' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --port ${PORTA_WEB} --strictPort`,
      url: `http://localhost:${PORTA_WEB}`,
      env: { VITE_API_URL: `http://localhost:${PORTA_API}` },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
