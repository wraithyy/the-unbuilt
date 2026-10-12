// Device-agnostic input. Keyboard/mouse and touch both write here; the sim reads and
// consumes it once per frame.

export interface InputState {
  /** Movement intent, x = strafe right, y = forward. Each in [-1, 1]. */
  moveX: number
  moveY: number
  /** Accumulated look delta in pixels since last consume. */
  lookX: number
  lookY: number
  jump: boolean
  interact: boolean
  /** Eyes closed (held or toggled, see settings). */
  eyes: boolean
  /** Held keyboard look axes in [-1, 1] (arrow keys), integrated per frame. */
  keyLookX: number
  keyLookY: number
  /** Look multiplier for the active device (touch drags are slower than mice). */
  lookScale: number
}

export const input: InputState = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  keyLookX: 0,
  keyLookY: 0,
  jump: false,
  interact: false,
  eyes: false,
  lookScale: 1,
}

/** Edge-triggered buttons are cleared after the sim reads them. */
export function consumeEdges() {
  input.lookX = 0
  input.lookY = 0
  input.jump = false
  input.interact = false
}

export function resetInput() {
  input.moveX = 0
  input.moveY = 0
  input.keyLookX = 0
  input.keyLookY = 0
  input.eyes = false
  consumeEdges()
}
