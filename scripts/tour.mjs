import { chromium } from '@playwright/test'
// Headless tour: screenshots from each area's spawn. Usage: node scripts/tour.mjs <outPrefix>
const out = process.argv[2]
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto((process.env.URL ?? 'http://localhost:5173/?debug'))
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.getByRole('button', { name: 'Enter' }).click()
await page.waitForTimeout(500)
const ids = await page.evaluate(() => window.__unbuilt.areas.map((a) => a.id))
for (const id of ids) {
  await page.evaluate((id) => {
    const g = window.__unbuilt
    const a = g.getArea(id)
    g.warp(a.spawn.pos, a.spawn.yaw)
  }, id)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}-${id}.png` })
}
console.log('areas', ids.join(','), 'errors', JSON.stringify(errs))
await browser.close()
