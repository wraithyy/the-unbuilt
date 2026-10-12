import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type DirectionalLight, PCFShadowMap, type PerspectiveCamera, Vector3 } from 'three'
import { attachKeyboardMouse } from '../engine/input/keyboard-mouse'
import { consumeEdges, input } from '../engine/input/state'
import { cameraPose, look } from '../engine/player'
import { FIXED_DT, type Game } from '../gameplay/game'
import { World } from '../world/World'
import { type Quality, useUi } from './store'

// Hosts the three.js canvas and drives the fixed-step simulation from one useFrame.

const BASE_SENSITIVITY = 0.0022
const MAX_STEPS = 5
/** Arrow-key look speed, in mouse-pixel equivalents per second. */
const KEY_LOOK_RATE = 700
const eyeTmp = new Vector3()

const QUALITY: Record<Quality, { dpr: number; shadows: boolean; shadowMap: number; aa: boolean }> =
  {
    low: { dpr: 1, shadows: false, shadowMap: 512, aa: false },
    medium: { dpr: 1.5, shadows: true, shadowMap: 1024, aa: true },
    high: { dpr: 2, shadows: true, shadowMap: 2048, aa: true },
  }

function Driver({ game }: { game: Game }) {
  const camera = useThree((s) => s.camera)
  const acc = useRef(0)
  useFrame((_, delta) => {
    const ui = useUi.getState()
    const cam = camera as PerspectiveCamera // R3F default camera is perspective.
    if (ui.screen === 'playing' && !ui.overlay) {
      const s = ui.settings
      const dt = Math.min(delta, 0.1)
      look(
        game.player,
        input.lookX * input.lookScale + input.keyLookX * KEY_LOOK_RATE * dt,
        input.lookY * input.lookScale + input.keyLookY * KEY_LOOK_RATE * 0.7 * dt,
        BASE_SENSITIVITY * s.sensitivity,
        s.invertY,
      )
      game.options.reducedMotion = s.reducedMotion
      acc.current = Math.min(acc.current + Math.min(delta, 0.1), FIXED_DT * MAX_STEPS)
      let interact = input.interact
      let jump = input.jump
      let stepped = false
      while (acc.current >= FIXED_DT) {
        game.step(FIXED_DT, { x: input.moveX, y: input.moveY, jump, interact }, cam)
        interact = false
        jump = false
        stepped = true
        acc.current -= FIXED_DT
      }
      ui.setPrompt(game.prompt)
      // On >60 Hz displays many frames run no step; presses wait for the next one.
      if (!stepped) {
        input.lookX = 0
        input.lookY = 0
        cameraPose(game.player, eyeTmp, cam.quaternion)
        cam.position.copy(eyeTmp)
        return
      }
    }
    consumeEdges()
    cameraPose(game.player, eyeTmp, cam.quaternion)
    cam.position.copy(eyeTmp)
  })
  return null
}

const lightOffset = new Vector3(14, 26, 9)

/** One directional light whose shadow frustum follows the player. */
function Lights({ game, shadows, mapSize }: { game: Game; shadows: boolean; mapSize: number }) {
  const ref = useRef<DirectionalLight>(null)
  useFrame(() => {
    const l = ref.current
    if (!l) return
    l.position.copy(game.player.pos).add(lightOffset)
    l.target.position.copy(game.player.pos)
    l.target.updateMatrixWorld()
  })
  return (
    <>
      <hemisphereLight args={['#fffdf8', '#e2dccf', 3.1]} />
      <directionalLight
        ref={ref}
        intensity={1.4}
        castShadow={shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  )
}

/** Lowers DPR when frames are slow, raises it back when there is headroom. */
function AdaptiveDpr({ max }: { max: number }) {
  const setDpr = useThree((s) => s.setDpr)
  const stats = useRef({ t: 0, n: 0, dpr: Math.min(max, window.devicePixelRatio) })
  useEffect(() => {
    stats.current.dpr = Math.min(max, window.devicePixelRatio)
    setDpr(stats.current.dpr)
  }, [max, setDpr])
  useFrame((_, delta) => {
    const s = stats.current
    s.t += delta
    s.n++
    if (s.t < 2) return
    const avg = s.t / s.n
    s.t = 0
    s.n = 0
    const cap = Math.min(max, window.devicePixelRatio)
    if (avg > 1 / 40 && s.dpr > 0.75) s.dpr = Math.max(0.75, s.dpr - 0.25)
    else if (avg < 1 / 58 && s.dpr < cap) s.dpr = Math.min(cap, s.dpr + 0.25)
    else return
    setDpr(s.dpr)
  })
  return null
}

export function GameView({ game }: { game: Game }) {
  const quality = useUi((s) => s.settings.quality)
  const q = QUALITY[quality]
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasEl) return
    const detach = attachKeyboardMouse(canvasEl, () => useUi.getState().screen === 'playing')
    const onLock = () => {
      const locked = document.pointerLockElement === canvasEl
      const ui = useUi.getState()
      ui.set({ pointerLocked: locked })
      // Esc releases pointer lock: treat that as pause.
      if (!locked && ui.screen === 'playing' && !ui.touch) ui.setScreen('paused')
    }
    document.addEventListener('pointerlockchange', onLock)
    return () => {
      detach()
      document.removeEventListener('pointerlockchange', onLock)
    }
  }, [canvasEl])

  const glProps = useMemo(
    () => ({ antialias: q.aa, powerPreference: 'high-performance' as const }),
    [q.aa],
  )

  return (
    <Canvas
      key={quality}
      className="game-canvas"
      gl={glProps}
      dpr={Math.min(q.dpr, window.devicePixelRatio)}
      shadows={q.shadows ? { type: PCFShadowMap } : false}
      camera={{ fov: 72, near: 0.05, far: 160 }}
      onCreated={(s) => {
        setCanvasEl(s.gl.domElement)
        // Debug/perf hook for headless measurement (scripts/perf.mjs).
        if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { __gl: s.gl })
      }}
      onPointerDown={(e) => {
        const ui = useUi.getState()
        if (ui.screen === 'playing' && !ui.touch && e.pointerType === 'mouse') {
          canvasEl?.requestPointerLock?.()?.catch?.(() => undefined)
        }
      }}
    >
      <Driver game={game} />
      <Lights game={game} shadows={q.shadows} mapSize={q.shadowMap} />
      <World game={game} shadows={q.shadows} />
      <AdaptiveDpr max={q.dpr} />
    </Canvas>
  )
}
