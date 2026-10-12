import { expect, test } from '@playwright/test'
import { fresh, setYaw, state } from './helpers'

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('boots to the main menu without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await fresh(page)
    await expect(page.getByRole('heading', { name: 'The Unbuilt' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('portfolio is reachable without playing, and Escape returns focus', async ({ page }) => {
    await fresh(page)
    const open = page.getByRole('button', { name: 'Portfolio' })
    await open.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Bring me a hard problem.')).toBeVisible()
    await expect(dialog.getByRole('link', { name: /wraithyy/ })).toHaveAttribute(
      'href',
      'https://github.com/wraithyy',
    )
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(open).toBeFocused()
  })

  test('keyboard moves the player; Arrival can be solved and progress persists', async ({
    page,
  }) => {
    await fresh(page)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.waitForTimeout(400)
    const start = await state(page)
    expect(start.area).toBe('arrival')

    // Walk backwards through the drawn door while looking into the room.
    await setYaw(page, Math.PI)
    await page.waitForTimeout(300)
    await page.keyboard.down('KeyS')
    await expect
      .poll(async () => (await state(page)).pos[2], { timeout: 15_000 })
      .toBeLessThan(-2.2)
    await page.keyboard.up('KeyS')

    // The wanderer reaches the plate while unwatched.
    await expect
      .poll(async () => (await state(page)).flags, { timeout: 15_000 })
      .toContain('arrival:done')

    await setYaw(page, 0)
    await page.keyboard.down('KeyW')
    await expect.poll(async () => (await state(page)).area, { timeout: 20_000 }).toBe('atrium')
    await page.keyboard.up('KeyW')

    // Reload and continue: checkpoint + latched flags are restored.
    await page.reload()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(300)
    const restored = await state(page)
    expect(restored.area).toBe('atrium')
    expect(restored.flags).toContain('arrival:done')
  })

  test('arrow keys look around without a mouse', async ({ page }) => {
    await fresh(page)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.waitForTimeout(300)
    const yaw = () =>
      page.evaluate(
        () =>
          (window as unknown as { __unbuilt: { player: { yaw: number } } }).__unbuilt.player.yaw,
      )
    const before = await yaw()
    await page.keyboard.down('ArrowLeft')
    await expect.poll(yaw, { timeout: 10_000 }).toBeGreaterThan(before + 0.3)
    await page.keyboard.up('ArrowLeft')
  })

  test('settings dialog traps focus and restores it', async ({ page }) => {
    await fresh(page)
    const opener = page.getByRole('button', { name: 'Settings' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('pause menu offers hint and reset', async ({ page }) => {
    await fresh(page)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.getByRole('button', { name: 'Hint' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'north wall' })).toBeVisible()
    await page.getByRole('button', { name: 'Reset puzzle' }).click()
    await expect(page.getByRole('button', { name: 'Hint' })).toBeHidden()
  })

  test('corrupt save is discarded with a notice', async ({ page }) => {
    await page.goto('/?debug')
    await page.evaluate(() => localStorage.setItem('unbuilt.save', '{broken'))
    await page.reload()
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toContainText('reset')
    expect((await state(page)).area).toBe('arrival')
  })
})

test.describe('mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only')

  test('touch joystick moves the player and the look zone turns the view', async ({ page }) => {
    await fresh(page)
    await page.getByRole('button', { name: 'Enter' }).tap()
    await page.waitForTimeout(400)
    const layer = page.getByTestId('touch-layer')
    await expect(layer).toBeVisible()
    const vp = page.viewportSize()
    if (!vp) throw new Error('no viewport')
    const before = await state(page)

    // Hold the joystick forward via raw touch pointer events.
    const cdp = await page.context().newCDPSession(page)
    const sx = vp.width * 0.2
    const sy = vp.height * 0.7
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      points: { x: number; y: number; id: number }[],
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id })),
      })
    await touch('touchStart', [{ x: sx, y: sy, id: 1 }])
    await touch('touchMove', [{ x: sx, y: sy - 50, id: 1 }])
    await expect
      .poll(async () => (await state(page)).pos[2], { timeout: 15_000 })
      .toBeLessThan(before.pos[2] - 1)
    await touch('touchEnd', [])

    // Drag on the right half to look.
    const yaw0 = await page.evaluate(
      () => (window as unknown as { __unbuilt: { player: { yaw: number } } }).__unbuilt.player.yaw,
    )
    await touch('touchStart', [{ x: vp.width * 0.75, y: vp.height * 0.5, id: 2 }])
    await touch('touchMove', [{ x: vp.width * 0.75 - 120, y: vp.height * 0.5, id: 2 }])
    await touch('touchEnd', [])
    await page.waitForTimeout(100)
    const yaw1 = await page.evaluate(
      () => (window as unknown as { __unbuilt: { player: { yaw: number } } }).__unbuilt.player.yaw,
    )
    expect(Math.abs(yaw1 - yaw0)).toBeGreaterThan(0.2)

    // No page scroll happened during play.
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('portfolio overlay scrolls and fits a phone', async ({ page }) => {
    await fresh(page)
    await page.getByRole('button', { name: 'Portfolio' }).tap()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
  })
})
