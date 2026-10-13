import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  type Group,
  InstancedMesh,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  Mesh as MeshClass,
  MeshLambertMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { useUi } from '../app/store'
import type { Game } from '../gameplay/game'
import { worldText } from '../i18n'
import { Anamorphs } from './Anamorph'
import { buildUniforms, patchFill, patchLine } from './buildShader'
import { Decor } from './Decor'
import type { Box, CaptionDef, Material } from './types'

// Renders a Game. Static geometry is built once (instanced per material, edges merged
// into one draw call); dynamic entities are plain meshes updated imperatively per frame.

export const PALETTE = {
  paper: '#f3f0e9',
  surface: '#e6e1d7',
  ink: '#1a1815',
  accent: '#c93a20',
  glass: '#dedad2',
  fog: '#0d0c0b',
  hairline: '#1a1815',
} as const

const unitBox = new BoxGeometry(1, 1, 1)
const unitEdges = new EdgesGeometry(unitBox)

const materials: Record<Material, MeshLambertMaterial> = {
  paper: new MeshLambertMaterial({ color: PALETTE.paper }),
  surface: new MeshLambertMaterial({ color: PALETTE.surface }),
  ink: new MeshLambertMaterial({ color: PALETTE.ink }),
  accent: new MeshLambertMaterial({ color: PALETTE.accent }),
  glass: new MeshLambertMaterial({ color: PALETTE.glass, transparent: true, opacity: 0.35 }),
}
// Static architecture uses the build/unbuild variants; dynamic entities stay solid so
// interactive things always read as real.
const staticMaterials = Object.fromEntries(
  Object.entries(materials).map(([k, m]) => [k, patchFill(m.clone())]),
) as Record<Material, MeshLambertMaterial>
const staticEdge = patchLine(
  new LineBasicMaterial({ color: PALETTE.hairline, transparent: true, opacity: 0.55 }),
)
const staticEdgeOnInk = patchLine(
  new LineBasicMaterial({ color: '#8a847b', transparent: true, opacity: 0.6 }),
)
const edgeMat = new LineBasicMaterial({ color: PALETTE.hairline, transparent: true, opacity: 0.5 })
const edgeOnInk = new LineBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.25 })
const accentEdge = new LineBasicMaterial({ color: PALETTE.accent })
// Glass doors would vanish against paper without a drawn outline.
const glassEdge = new LineBasicMaterial({ color: PALETTE.ink })
const dashed = new LineDashedMaterial({
  color: PALETTE.ink,
  dashSize: 0.12,
  gapSize: 0.1,
  transparent: true,
  opacity: 0.55,
})

const center = new Vector3()
const size = new Vector3()
const m4 = new Matrix4()
const q0 = new Quaternion()

function boxCenterSize(b: Box) {
  center.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2)
  size.set(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2])
}

function edgeGeometry(boxes: Box[]) {
  const pos = unitEdges.getAttribute('position')
  const arr = new Float32Array(boxes.length * pos.count * 3)
  let i = 0
  for (const b of boxes) {
    boxCenterSize(b)
    for (let v = 0; v < pos.count; v++) {
      arr[i++] = center.x + pos.getX(v) * size.x
      arr[i++] = center.y + pos.getY(v) * size.y
      arr[i++] = center.z + pos.getZ(v) * size.z
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(arr, 3))
  return g
}

function StaticWorld({ game, shadows }: { game: Game; shadows: boolean }) {
  const { meshes, lines, inkLines } = useMemo(() => {
    const always = game.statics.filter((s) => s.def.when === undefined)
    const byMat = new Map<Material, Box[]>()
    for (const s of always) {
      const k = s.def.mat ?? 'paper'
      byMat.set(k, [...(byMat.get(k) ?? []), s.def])
    }
    const meshes = [...byMat].map(([mat, boxes]) => {
      const im = new InstancedMesh(unitBox, staticMaterials[mat], boxes.length)
      boxes.forEach((b, i) => {
        boxCenterSize(b)
        im.setMatrixAt(i, m4.compose(center, q0, size))
      })
      im.computeBoundingSphere()
      return im
    })
    const light = always.filter((s) => (s.def.mat ?? 'paper') !== 'ink').map((s) => s.def)
    const dark = always.filter((s) => s.def.mat === 'ink').map((s) => s.def)
    return {
      meshes,
      lines: new LineSegments(edgeGeometry(light), staticEdge),
      inkLines: new LineSegments(edgeGeometry(dark), staticEdgeOnInk),
    }
  }, [game])

  useEffect(() => {
    for (const m of meshes) {
      m.castShadow = shadows
      m.receiveShadow = shadows
    }
  }, [meshes, shadows])

  useEffect(
    () => () => {
      for (const m of meshes) m.dispose()
      lines.geometry.dispose()
      inkLines.geometry.dispose()
    },
    [meshes, lines, inkLines],
  )

  return (
    <>
      {meshes.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
      <primitive object={lines} />
      <primitive object={inkLines} />
    </>
  )
}

/** A box mesh with hairline edges; returned group is positioned/scaled imperatively. */
function BoxVisual({
  mat,
  refFn,
  shadows,
  edges = edgeMat,
}: {
  mat: Material
  refFn: (g: Group | null) => void
  shadows: boolean
  edges?: LineBasicMaterial | LineDashedMaterial
}) {
  return (
    <group ref={refFn}>
      <mesh
        geometry={unitBox}
        material={materials[mat]}
        castShadow={shadows}
        receiveShadow={shadows}
      />
      <lineSegments geometry={unitEdges} material={edges} />
    </group>
  )
}

function place(g: Group | undefined, b: { min: Vector3; max: Vector3 }) {
  if (!g) return
  g.position.addVectors(b.min, b.max).multiplyScalar(0.5)
  g.scale.subVectors(b.max, b.min)
}

function DynamicWorld({ game, shadows }: { game: Game; shadows: boolean }) {
  const gated = useMemo(() => game.statics.filter((s) => s.def.when !== undefined), [game])
  const refs = useRef(new Map<string, Group>())
  const set = (key: string) => (g: Group | null) => {
    if (g) refs.current.set(key, g)
    else refs.current.delete(key)
  }

  const dashedEdges = useMemo(() => {
    const ls = new LineSegments(unitEdges, dashed)
    ls.computeLineDistances()
    return ls.geometry
  }, [])

  useFrame(() => {
    const r = refs.current
    gated.forEach((s, i) => {
      const g = r.get(`s${i}`)
      if (!g) return
      g.visible = s.active
      if (s.active) place(g, s.box)
    })
    game.cubes.forEach((c, i) => {
      const g = r.get(`c${i}`)
      if (!g) return
      g.visible = c.alive
      place(g, c.box)
      const line = g.children[1]
      if (line instanceof LineSegments)
        line.material = c.held && game.prompt === 'blocked' ? accentEdge : edgeMat
    })
    game.plates.forEach((p, i) => {
      const g = r.get(`p${i}`)
      if (!g) return
      place(g, p.box)
      const mesh = g.children[0]
      if (mesh instanceof MeshClass) mesh.material = p.pressed ? materials.ink : materials.accent
    })
    game.doors.forEach((d, i) => {
      const g = r.get(`d${i}`)
      if (!g) return
      g.visible = d.open < 0.99
      place(g, d.box)
    })
    game.ghosts.forEach((gh, i) => {
      const solid = r.get(`g${i}`)
      const ghost = r.get(`gw${i}`)
      if (solid) {
        solid.visible = gh.present
        place(solid, gh.box)
        const line = solid.children[1]
        if (line instanceof LineSegments) line.material = gh.since < 0.6 ? accentEdge : edgeMat
      }
      if (ghost) {
        // "fig. 01 — wireframe, no fill": absent geometry is drawn as a dashed outline.
        ghost.visible = !gh.present && gh.def.present === 'unseen'
        place(ghost, gh.box)
      }
    })
    game.aligns.forEach((a, i) => {
      const g = r.get(`a${i}`)
      if (!g) return
      g.visible = a.solid
      place(g, a.box)
    })
  })

  return (
    <>
      {gated.map((s, i) => (
        <BoxVisual
          key={`s${i}`}
          mat={s.def.mat ?? 'paper'}
          refFn={set(`s${i}`)}
          shadows={shadows}
        />
      ))}
      {game.cubes.map((c, i) => (
        <BoxVisual
          key={c.def.id + i}
          mat={c.def.scalable ? 'surface' : 'paper'}
          refFn={set(`c${i}`)}
          shadows={shadows}
        />
      ))}
      {game.plates.map((p, i) => (
        <BoxVisual key={p.def.id + i} mat="accent" refFn={set(`p${i}`)} shadows={false} />
      ))}
      {game.doors.map((d, i) => (
        <BoxVisual
          key={d.def.id + i}
          mat={d.def.mat ?? 'ink'}
          refFn={set(`d${i}`)}
          shadows={shadows}
          edges={d.def.mat === 'glass' ? glassEdge : edgeOnInk}
        />
      ))}
      {game.ghosts.map((gh, i) => (
        <group key={gh.def.id + i}>
          <BoxVisual mat={gh.def.mat ?? 'paper'} refFn={set(`g${i}`)} shadows={shadows} />
          <group ref={set(`gw${i}`)}>
            <lineSegments geometry={dashedEdges} material={dashed} />
          </group>
        </group>
      ))}
      {game.aligns.map((a, i) => (
        <group key={a.def.id + i}>
          {a.def.fragments.map((f, j) => {
            boxCenterSize(f)
            return (
              <group key={j} position={center.toArray()} scale={size.toArray()}>
                <mesh
                  geometry={unitBox}
                  material={materials[f.mat ?? 'paper']}
                  castShadow={shadows}
                  receiveShadow={shadows}
                />
                <lineSegments geometry={unitEdges} material={edgeMat} />
              </group>
            )
          })}
          <group ref={set(`a${i}`)}>
            <mesh geometry={unitBox} material={materials.glass} />
            <lineSegments geometry={unitEdges} material={accentEdge} />
          </group>
        </group>
      ))}
    </>
  )
}

function textTexture(text: string, style: 'fig' | 'display') {
  const fontPx = style === 'display' ? 160 : 64
  const font =
    style === 'display' ? `400 ${fontPx}px "Instrument Serif"` : `400 ${fontPx}px "JetBrains Mono"`
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + 16
  const h = Math.ceil(fontPx * 1.3)
  c.width = w
  c.height = h
  ctx.font = font
  ctx.fillStyle = style === 'display' ? PALETTE.ink : '#6b6660'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 8, h / 2)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: w / h }
}

function Caption({ def, visible }: { def: CaptionDef; visible: () => boolean }) {
  const lang = useUi((s) => s.settings.lang)
  const fontsReady = useFontsReady()
  const ref = useRef<Mesh>(null)
  const data = useMemo(
    () => (fontsReady ? textTexture(worldText(def.text, lang), def.style ?? 'fig') : null),
    [def, lang, fontsReady],
  )
  const mat = useMemo(
    () =>
      data
        ? new MeshBasicMaterial({
            map: data.tex,
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
          })
        : null,
    [data],
  )
  useEffect(
    () => () => {
      data?.tex.dispose()
      mat?.dispose()
    },
    [data, mat],
  )
  useFrame(() => {
    if (ref.current) ref.current.visible = visible()
  })
  if (!data || !mat) return null
  const h = def.size ?? (def.style === 'display' ? 0.8 : 0.16)
  return (
    <mesh
      ref={ref}
      position={[...def.pos]}
      rotation={[0, def.rotY ?? 0, def.roll ?? 0]}
      scale={[h * 1.3 * data.aspect, h * 1.3, 1]}
      material={mat}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

let fontsPromise: Promise<unknown> | null = null
let fontsLoaded = false

/** Canvas text needs the web fonts loaded first, or it silently falls back to serif. */
function useFontsReady() {
  const [ready, setReady] = useState(fontsLoaded)
  useEffect(() => {
    if (ready) return
    fontsPromise ??= Promise.all([
      document.fonts.load('400 64px "JetBrains Mono"'),
      document.fonts.load('400 160px "Instrument Serif"'),
    ]).catch(() => null)
    fontsPromise.then(() => {
      fontsLoaded = true
      setReady(true)
    })
  }, [ready])
  return ready
}

function Captions({ game }: { game: Game }) {
  return (
    <>
      {game.captions.map((c, i) => (
        <Caption key={c.def.id + i} def={c.def} visible={() => c.visible && !game.eyesClosed} />
      ))}
    </>
  )
}

const lookDir = new Vector3()

const fillMaterials = [...Object.values(materials), ...Object.values(staticMaterials)]
const INK = new Color(PALETTE.ink)
const PAPER_LINE = new Color('#e8e4dc')
let wasBlind = false

/** Eyes closed: hide every fill, turn every line into the light blueprint. */
function applyBlind(blind: boolean) {
  if (blind === wasBlind) return
  wasBlind = blind
  for (const m of fillMaterials) m.visible = !blind
  edgeMat.color.copy(blind ? PAPER_LINE : INK)
  edgeMat.opacity = blind ? 0.9 : 0.5
  dashed.color.copy(blind ? PAPER_LINE : INK)
  edgeOnInk.opacity = blind ? 0.9 : 0.25
  buildUniforms.uBlind.value = blind ? 1 : 0
}

/** Feeds the build shader the camera every frame. */
function BuildDriver({ game }: { game: Game }) {
  useEffect(() => () => applyBlind(false), [])
  useFrame(({ camera, clock, scene }) => {
    applyBlind(game.eyesClosed)
    // Blind, you only sense the blueprint close around you.
    if (scene.fog && 'far' in scene.fog) {
      scene.fog.near = game.eyesClosed ? 3 : 12
      scene.fog.far = game.eyesClosed ? 24 : 80
    }
    buildUniforms.uEye.value.copy(camera.position)
    camera.getWorldDirection(lookDir)
    buildUniforms.uDir.value.copy(lookDir)
    buildUniforms.uTime.value = clock.elapsedTime
  })
  useEffect(() => {
    if (new URLSearchParams(location.search).has('debug'))
      Object.assign(window, { __build: buildUniforms })
  }, [])
  return null
}

export function World({ game, shadows }: { game: Game; shadows: boolean }) {
  const fontsReady = useFontsReady()
  const fog = useMemo(() => new Color(PALETTE.fog), [])
  return (
    <>
      <color attach="background" args={[fog]} />
      <fog attach="fog" args={[fog, 12, 80]} />
      <BuildDriver game={game} />
      <Decor game={game} />
      <StaticWorld game={game} shadows={shadows} />
      <DynamicWorld game={game} shadows={shadows} />
      <Captions game={game} />
      <Anamorphs game={game} fontsReady={fontsReady} />
    </>
  )
}
