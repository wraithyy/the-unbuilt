import type { Page } from '@playwright/test'

export interface Snapshot {
  pos: number[]
  area: string
  flags: string[]
  gravity: string
}

export async function fresh(page: Page) {
  await page.goto('/?debug')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

export async function state(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    // Debug handle exposed by src/app/session.ts when ?debug is present.
    const g = (window as unknown as { __unbuilt: import('../../src/gameplay/game').Game }).__unbuilt
    return {
      pos: g.player.pos.toArray(),
      area: g.area,
      flags: [...g.flags.all],
      gravity: g.player.gravity,
    }
  })
}

export async function setYaw(page: Page, yaw: number) {
  await page.evaluate((y) => {
    const g = (window as unknown as { __unbuilt: import('../../src/gameplay/game').Game }).__unbuilt
    g.player.yaw = y
    g.player.pitch = 0
  }, yaw)
}
