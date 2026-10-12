import { chromium } from '@playwright/test'
// Screenshots from hand-picked viewpoints: node scripts/views.mjs <outPrefix>
const out = process.argv[2]
const views = {
  'entry-up': { pos: [0, 0.85, -13.2], yaw: -Math.PI / 4, pitch: 0.62 },
  'atrium-up': { pos: [0, 0.85, -40], yaw: Math.PI, pitch: 0.9 },
  'arrival': { pos: [0, 0.85, 4], yaw: 0, pitch: 0 },
  'core': { pos: [0, 0.85, -22], yaw: 0, pitch: 0.15 },
}
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(process.env.URL ?? 'http://localhost:5173/?debug')
await page.getByRole('button', { name: /Enter|Continue/ }).click()
await page.waitForTimeout(500)
for (const [name, v] of Object.entries(process.env.ONLY ? { [process.env.ONLY]: views[process.env.ONLY] } : views)) {
  await page.evaluate((v) => {
    const g = window.__unbuilt
    g.warp(v.pos, v.yaw)
    g.player.pitch = v.pitch
  }, v)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}-${name}.png` })
}
await browser.close()
