import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { useUi } from '../app/store'
import type { AnamorphState, Game } from '../gameplay/game'
import { worldText } from '../i18n'
import type { Lang } from '../portfolio/data'

// Anamorphic monuments. The panel is cut into a grid of shards; shard i sits on the ray
// from the vantage eye V through its place P on the panel, at V + (P - V) * k_i and scaled
// by k_i, so from V the shards tile the panel exactly. `uAssemble` eases every k_i to 1.

const COLS = 6
const ROWS = 3

function panelTexture(a: AnamorphState, lang: Lang) {
  const d = a.def
  const label = worldText(d.label, lang)
  const title = worldText(d.title, lang)
  const lines = d.lines.map((k) => worldText(k, lang))
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const W = 2048
  const pad = 110
  const titleFont = '400 150px "Instrument Serif"'
  const bodyFont = '400 50px "JetBrains Mono"'
  const labelFont = '400 42px "JetBrains Mono"'
  const wrap = (text: string, font: string) => {
    ctx.font = font
    const out: string[] = []
    let cur = ''
    for (const word of text.split(' ')) {
      const next = cur ? `${cur} ${word}` : word
      if (ctx.measureText(next).width > W - pad * 2 && cur) {
        out.push(cur)
        cur = word
      } else cur = next
    }
    out.push(cur)
    return out
  }
  const titleLines = wrap(title, titleFont)
  const wrapped = lines.flatMap((l) => wrap(l, bodyFont))
  const titleH = titleLines.length * 160 + 20
  const H = pad * 2 + 70 + titleH + 40 + wrapped.length * 78
  c.width = W
  c.height = H
  ctx.fillStyle = '#121110'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#ff5a3c'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, W - 6, H - 6)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ff5a3c'
  ctx.font = labelFont
  ctx.fillText(label, pad, pad)
  ctx.fillStyle = '#efe9df'
  ctx.font = titleFont
  titleLines.forEach((l, i) => {
    ctx.fillText(l, pad, pad + 70 + i * 160)
  })
  ctx.font = bodyFont
  ctx.fillStyle = '#cfc8bc'
  wrapped.forEach((l, i) => {
    ctx.fillText(l, pad, pad + 70 + titleH + 40 + i * 78)
  })
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: W / H }
}

/** Deterministic pseudo-random depth factors, never 1 so every shard is visibly displaced. */
function depthFactor(i: number) {
  const r = Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1
  const k = 0.5 + r * 0.95
  return Math.abs(k - 1) < 0.08 ? k + 0.15 : k
}

function shardGeometry(a: AnamorphState, aspect: number) {
  const d = a.def
  const V = new Vector3(...d.vantage)
  const C = new Vector3(...d.center)
  const h = d.height
  const w = h * aspect
  // Panel faces the vantage horizontally (text stays upright).
  const toV = V.clone().sub(C).setY(0).normalize()
  const right = new Vector3(0, 1, 0).cross(toV).normalize()
  const up = new Vector3(0, 1, 0)
  const n = COLS * ROWS
  const pos = new Float32Array(n * 4 * 3)
  const orig = new Float32Array(n * 4 * 3)
  const kAttr = new Float32Array(n * 4)
  const uv = new Float32Array(n * 4 * 2)
  const index: number[] = []
  const corner = new Vector3()
  let s = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++, s++) {
      const k = depthFactor(s)
      const u0 = c / COLS
      const u1 = (c + 1) / COLS
      const v0 = r / ROWS
      const v1 = (r + 1) / ROWS
      const corners = [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ]
      corners.forEach(([u, v], j) => {
        corner
          .copy(C)
          .addScaledVector(right, (u - 0.5) * w)
          .addScaledVector(up, (v - 0.5) * h)
        const o = (s * 4 + j) * 3
        orig[o] = corner.x
        orig[o + 1] = corner.y
        orig[o + 2] = corner.z
        pos[o] = corner.x
        pos[o + 1] = corner.y
        pos[o + 2] = corner.z
        kAttr[s * 4 + j] = k
        uv[(s * 4 + j) * 2] = u
        uv[(s * 4 + j) * 2 + 1] = v
      })
      const b = s * 4
      index.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aOrig', new BufferAttribute(orig, 3))
  g.setAttribute('aK', new BufferAttribute(kAttr, 1))
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.setIndex(index)
  g.computeBoundingSphere()
  return { g, V }
}

function Monument({ a, lang, game }: { a: AnamorphState; lang: Lang; game: Game }) {
  const mesh = useRef<Mesh>(null)
  const marker = useRef<Mesh>(null)
  const built = useMemo(() => {
    const p = panelTexture(a, lang)
    if (!p) return null
    const { g, V } = shardGeometry(a, p.aspect)
    const uniforms = { uV: { value: V }, uAssemble: { value: a.assembled } }
    const mat = new MeshBasicMaterial({ map: p.tex, side: DoubleSide, fog: false })
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader =
        `attribute vec3 aOrig;\nattribute float aK;\nuniform vec3 uV;\nuniform float uAssemble;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          'vec3 transformed = uV + (aOrig - uV) * mix(aK, 1.0, uAssemble);',
        )
    }
    return { g, mat, tex: p.tex, uniforms }
  }, [a, lang])
  useEffect(
    () => () => {
      built?.g.dispose()
      built?.mat.dispose()
      built?.tex.dispose()
    },
    [built],
  )
  useFrame(() => {
    if (!built || !mesh.current) return
    const eased = 1 - (1 - a.assembled) ** 3
    built.uniforms.uAssemble.value = eased
    mesh.current.visible = a.visible && !game.eyesClosed
    if (marker.current) marker.current.visible = a.visible && !a.read
  })
  if (!built) return null
  const [vx, vy, vz] = a.def.vantage
  return (
    <>
      <mesh ref={mesh} geometry={built.g} material={built.mat} frustumCulled={false} />
      <mesh ref={marker} position={[vx, vy - 1.465, vz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial color="#ff5a3c" />
      </mesh>
    </>
  )
}

export function Anamorphs({ game, fontsReady }: { game: Game; fontsReady: boolean }) {
  const lang = useUi((s) => s.settings.lang)
  if (!fontsReady) return null
  return (
    <>
      {game.anamorphs.map((a) => (
        <Monument key={a.def.id + lang} a={a} lang={lang} game={game} />
      ))}
    </>
  )
}
