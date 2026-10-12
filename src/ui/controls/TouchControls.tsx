import { useEffect, useRef, useState } from 'react'
import { useUi } from '../../app/store'
import { input } from '../../engine/input/state'
import { t } from '../../i18n'
import './touch.css'

// Left half: floating joystick (origin = where the thumb lands). Right half: drag to look.
// Each pointer is owned by the zone it started in until it ends or is cancelled.

const TOUCH_LOOK_SCALE = 2.4
const DEADZONE = 0.12

type Owner = { kind: 'stick'; ox: number; oy: number } | { kind: 'look'; x: number; y: number }

export function TouchControls() {
  const layer = useRef<HTMLDivElement>(null)
  const owners = useRef(new Map<number, Owner>())
  const [stick, setStick] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(
    null,
  )
  const prompt = useUi((s) => s.prompt)
  const settings = useUi((s) => s.settings)
  const radius = 56 * settings.joystickSize

  useEffect(() => {
    const el = layer.current
    if (!el) return
    const map = owners.current
    const release = (id: number) => {
      const o = map.get(id)
      map.delete(id)
      if (o?.kind === 'stick') {
        input.moveX = 0
        input.moveY = 0
        setStick(null)
      }
    }
    const down = (e: PointerEvent) => {
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      const left = e.clientX < window.innerWidth * 0.45
      const hasStick = [...map.values()].some((o) => o.kind === 'stick')
      if (left && !hasStick) {
        map.set(e.pointerId, { kind: 'stick', ox: e.clientX, oy: e.clientY })
        setStick({ ox: e.clientX, oy: e.clientY, kx: 0, ky: 0 })
      } else {
        map.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY })
      }
    }
    const move = (e: PointerEvent) => {
      const o = map.get(e.pointerId)
      if (!o) return
      e.preventDefault()
      if (o.kind === 'look') {
        input.lookX += e.clientX - o.x
        input.lookY += e.clientY - o.y
        input.lookScale = TOUCH_LOOK_SCALE
        o.x = e.clientX
        o.y = e.clientY
        return
      }
      let dx = e.clientX - o.ox
      let dy = e.clientY - o.oy
      const len = Math.hypot(dx, dy)
      if (len > radius) {
        dx = (dx / len) * radius
        dy = (dy / len) * radius
      }
      const mag = Math.min(1, len / radius)
      const scale = mag < DEADZONE ? 0 : (mag - DEADZONE) / (1 - DEADZONE) / (mag || 1)
      input.moveX = (dx / radius) * scale
      input.moveY = (-dy / radius) * scale
      setStick({ ox: o.ox, oy: o.oy, kx: dx, ky: dy })
    }
    const up = (e: PointerEvent) => release(e.pointerId)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('lostpointercapture', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('lostpointercapture', up)
      for (const id of [...map.keys()]) release(id)
    }
  }, [radius])

  const lang = settings.lang
  const actionLabel = prompt ? t(prompt, lang) : t('interact', lang)

  return (
    <div className="touch">
      <div ref={layer} className="touch-layer" data-testid="touch-layer" />
      {stick && (
        <div
          className="stick"
          style={{ left: stick.ox, top: stick.oy, width: radius * 2, height: radius * 2 }}
          aria-hidden
        >
          <div
            className="stick-knob"
            style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }}
          />
        </div>
      )}
      <div className="touch-buttons">
        <button
          type="button"
          className="touch-btn"
          data-active={prompt === 'grab' || prompt === 'drop' ? '' : undefined}
          onPointerDown={(e) => {
            e.stopPropagation()
            input.interact = true
          }}
          onClick={(e) => {
            if (e.detail === 0) input.interact = true
          }}
        >
          {actionLabel}
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-small"
          onPointerDown={(e) => {
            e.stopPropagation()
            input.jump = true
          }}
          onClick={(e) => {
            if (e.detail === 0) input.jump = true
          }}
        >
          {t('jump', lang)}
        </button>
      </div>
    </div>
  )
}
