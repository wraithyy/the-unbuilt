// Headless screenshots of the Loop: node scripts/loop.mjs <out-prefix>
import { chromium } from '@playwright/test'
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
const shot = async (name, pos, yaw, pitch = 0, flags = []) => {
  await page.evaluate(([p, y, pi, f]) => {
    const g = window.__unbuilt
    for (const x of f) g.setFlag(x)
    g.warp(p, y)
    g.player.pitch = pi
  }, [pos, yaw, pitch, flags])
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}-${name}.png` })
}
await shot('vestibule', [-18, 0.85, -32], Math.PI / 2)
await shot('bay-even', [-22.5, 0.85, -31.5], Math.PI / 2)
await shot('bay-odd', [-31.5, 0.85, -31.5], Math.PI / 2, 0, ['loop:odd'])
await shot('vault', [-34.9, 0.85, -31.5], Math.PI, -0.4, ['loop:odd'])
await shot('secret', [-96, 0.85, -33], -Math.PI / 2)
console.log('errors', errs)
await browser.close()
