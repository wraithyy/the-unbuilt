import { input } from './state'

// Desktop controls. Pointer lock is requested by the canvas on click; losing it while
// playing is treated as a pause request by the caller.

const held = new Set<string>()

const axis = (pos: string, neg: string) => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0)

// WASD moves, arrow keys look: the game is fully playable without a mouse.
function recompute() {
  input.moveY = axis('KeyW', 'KeyS')
  input.moveX = axis('KeyD', 'KeyA')
  input.keyLookX = axis('ArrowRight', 'ArrowLeft')
  input.keyLookY = axis('ArrowDown', 'ArrowUp')
}

export function attachKeyboardMouse(
  target: HTMLElement,
  isPlaying: () => boolean,
  eyesToggle: () => boolean,
) {
  const down = (e: KeyboardEvent) => {
    if (!isPlaying() || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.code === 'Space') {
      e.preventDefault()
      if (!e.repeat) input.jump = true
    }
    if (e.code === 'KeyQ' && !e.repeat) input.eyes = eyesToggle() ? !input.eyes : true
    if ((e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') && !e.repeat)
      input.interact = true
    if (e.code.startsWith('Arrow')) e.preventDefault()
    held.add(e.code)
    recompute()
  }
  const up = (e: KeyboardEvent) => {
    if (e.code === 'KeyQ' && !eyesToggle()) input.eyes = false
    held.delete(e.code)
    recompute()
  }
  const move = (e: MouseEvent) => {
    if (document.pointerLockElement !== target) return
    input.lookX += e.movementX
    input.lookY += e.movementY
    input.lookScale = 1
  }
  const click = (e: MouseEvent) => {
    if (!isPlaying() || e.button !== 0) return
    if (document.pointerLockElement === target) input.interact = true
  }
  const blur = () => {
    held.clear()
    if (!eyesToggle()) input.eyes = false
    recompute()
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('mousemove', move)
  window.addEventListener('blur', blur)
  target.addEventListener('mousedown', click)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('mousemove', move)
    window.removeEventListener('blur', blur)
    target.removeEventListener('mousedown', click)
    blur()
  }
}
