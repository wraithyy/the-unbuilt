import { chromium } from '@playwright/test'
// Per-area renderer stats (draw calls, triangles) + frame time. Swiftshader is a CPU
// rasterizer, so absolute fps here is a floor, not a device measurement.
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(process.argv[2] ?? (process.env.URL ?? 'http://localhost:5173/?debug'))
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.getByRole('button', { name: 'Enter' }).click()
await page.waitForTimeout(800)
const ids = await page.evaluate(() => window.__unbuilt.areas.map((a) => a.id))
for (const id of ids) {
  const r = await page.evaluate(async (id) => {
    const g = window.__unbuilt
    const a = g.getArea(id)
    g.warp(a.spawn.pos, a.spawn.yaw)
    await new Promise((res) => setTimeout(res, 500))
    const t0 = performance.now()
    let frames = 0
    await new Promise((res) => {
      const tick = () => (++frames < 60 ? requestAnimationFrame(tick) : res())
      requestAnimationFrame(tick)
    })
    const info = window.__gl.info
    return { calls: info.render.calls, tris: info.render.triangles, geos: info.memory.geometries, tex: info.memory.textures, ms: (performance.now() - t0) / frames }
  }, id)
  console.log(id.padEnd(12), JSON.stringify(r))
}
await browser.close()
