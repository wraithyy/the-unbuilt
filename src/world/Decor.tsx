import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  Euler,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { Game } from '../gameplay/game'
import type { Box } from './types'

// Non-colliding scenery in the void: an inverted Atrium overhead, a Penrose triangle that
// only closes from the Atrium entrance, impossible stair rings and drifting dust.
// Purely visual — nothing here affects the simulation.

const unit = new BoxGeometry(1, 1, 1)
const m4 = new Matrix4()
const q = new Quaternion()
const p = new Vector3()
const s = new Vector3()

function instanced(
  boxes: { c: Vector3; s: Vector3; r?: Quaternion }[],
  mat: MeshLambertMaterial | MeshBasicMaterial,
) {
  const im = new InstancedMesh(unit, mat, boxes.length)
  boxes.forEach((b, i) => {
    im.setMatrixAt(i, m4.compose(b.c, b.r ?? q.identity(), b.s))
  })
  im.computeBoundingSphere()
  im.frustumCulled = false
  return im
}

const toCS = (b: Box) => ({
  c: new Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2),
  s: new Vector3(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]),
})

const farMat = new MeshLambertMaterial({ color: '#efebe3', fog: false })
const dustMat = new MeshBasicMaterial({ color: '#d8d2c6', transparent: true, opacity: 0.55 })

/** Atrium, mirrored and hung upside-down above itself, turning very slowly. */
function InvertedHub({ game }: { game: Game }) {
  const group = useRef<Group>(null)
  const mesh = useMemo(() => {
    const hub = game.areas.find((a) => a.id === 'atrium')
    return hub ? instanced(hub.boxes.map(toCS), farMat) : null
  }, [game])
  useEffect(() => () => mesh?.dispose(), [mesh])
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.012
  })
  if (!mesh) return null
  return (
    <group position={[0, 58, -32]}>
      <group ref={group}>
        <group position={[0, 0, 32]} scale={[1, -1, 1]}>
          <primitive object={mesh} />
        </group>
      </group>
    </group>
  )
}

/**
 * Penrose triangle: three bars along +x, +y and -z. From the eye point V the two loose ends
 * are collinear with the eye, so the bars read as a closed triangle — from there only.
 */
const PENROSE_EYE = new Vector3(0, 1.47, -13.2)

function Penrose() {
  const mesh = useMemo(() => {
    const L = 16
    const t = 3
    const dir = new Vector3(1, 1, -1).normalize()
    const e0 = PENROSE_EYE.clone().addScaledVector(dir, 70)
    const bars = [
      { c: e0.clone().add(new Vector3(L / 2, 0, 0)), s: new Vector3(L + t, t, t) },
      { c: e0.clone().add(new Vector3(L, L / 2, 0)), s: new Vector3(t, L + t, t) },
      { c: e0.clone().add(new Vector3(L, L, -L / 2)), s: new Vector3(t, t, L + t) },
    ]
    return instanced(bars, farMat)
  }, [])
  useEffect(() => () => mesh.dispose(), [mesh])
  return <primitive object={mesh} />
}

/** Penrose stairs: rings of steps that climb forever and still close on themselves. */
function StairRings() {
  const rings = useMemo(
    () =>
      [
        { r: 95, tilt: new Euler(0.35, 0, 0.2), speed: 0.01, y: 20 },
        { r: 120, tilt: new Euler(-0.5, 0.4, 1.3), speed: -0.007, y: -10 },
        { r: 80, tilt: new Euler(1.2, 0, -0.4), speed: 0.013, y: 45 },
      ].map((cfg) => {
        const n = 72
        const steps = []
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2
          // Each quarter climbs; the jump at the seam is hidden by turning the step block.
          const rise = (i % (n / 4)) * 1.1
          const c = new Vector3(Math.cos(a) * cfg.r, rise, Math.sin(a) * cfg.r)
          const r = new Quaternion().setFromEuler(new Euler(0, -a, 0))
          steps.push({ c: c.setY(rise / 2), s: new Vector3(8.6, 1.4 + rise, 10), r })
        }
        return { ...cfg, mesh: instanced(steps, farMat) }
      }),
    [],
  )
  const refs = useRef<(Group | null)[]>([])
  useEffect(
    () => () => {
      for (const r of rings) r.mesh.dispose()
    },
    [rings],
  )
  useFrame((_, dt) => {
    rings.forEach((r, i) => {
      const g = refs.current[i]
      if (g) g.rotation.y += dt * r.speed
    })
  })
  return (
    <group position={[0, 0, -32]}>
      {rings.map((r, i) => (
        <group key={r.r} rotation={r.tilt} position={[0, r.y, 0]}>
          <group
            ref={(g) => {
              refs.current[i] = g
            }}
          >
            <primitive object={r.mesh} />
          </group>
        </group>
      ))}
    </group>
  )
}

const DUST_SPAN = 70
const wrap = (v: number, o: number) =>
  ((((v - o) % DUST_SPAN) + DUST_SPAN * 1.5) % DUST_SPAN) - DUST_SPAN / 2 + o

/** Dust drifting upward in the void; wraps around the player so it is always present. */
function Dust({ game }: { game: Game }) {
  const COUNT = 260
  const SPAN = DUST_SPAN
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, () => new Vector3(Math.random(), Math.random(), Math.random())),
    [],
  )
  const mesh = useMemo(() => {
    const im = new InstancedMesh(unit, dustMat, COUNT)
    im.frustumCulled = false
    return im
  }, [])
  useEffect(() => () => mesh.dispose(), [mesh])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const c = game.player.pos
    for (let i = 0; i < COUNT; i++) {
      const sd = seeds[i]
      p.set(
        wrap(sd.x * SPAN, c.x),
        wrap(sd.y * SPAN + t * (0.3 + sd.z * 0.4), c.y),
        wrap(sd.z * SPAN, c.z),
      )
      const k = 0.04 + sd.x * 0.08
      s.set(k, k, k)
      mesh.setMatrixAt(i, m4.compose(p, q.identity(), s))
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

export function Decor({ game }: { game: Game }) {
  const far = useRef<Group>(null)
  useFrame(() => {
    if (far.current) far.current.visible = !game.eyesClosed
  })
  return (
    <>
      <group ref={far}>
        <InvertedHub game={game} />
        <Penrose />
        <StairRings />
      </group>
      <Dust game={game} />
    </>
  )
}
