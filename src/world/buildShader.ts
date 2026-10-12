import { Color, type Material, Vector3 } from 'three'

// "The Unbuilt": static architecture is only built where it is looked at. Fill dissolves
// into voxel-sized cells with distance and toward the edge of vision, leaving the
// wireframe (the site's "fig. 01 — wireframe, no fill"). Lines turn light where the fill
// is gone so the drawing stays readable against the void.

export const buildUniforms = {
  uEye: { value: new Vector3() },
  uDir: { value: new Vector3(0, 0, -1) },
  uTime: { value: 0 },
  /** Distance where unbuilding starts / completes. */
  uNear: { value: 20 },
  uFar: { value: 58 },
  /** View-cosine where the periphery starts / finishes dissolving. */
  uEdge0: { value: 0.48 },
  uEdge1: { value: 0.6 },
  uAccent: { value: new Color('#ff5a3c') },
  uLineVoid: { value: new Color('#e8e4dc') },
  /** 0 disables the effect (reduced motion / low quality keeps it but calmer). */
  uStrength: { value: 1 },
  /** 1 while the player's eyes are closed: only the blueprint remains. */
  uBlind: { value: 0 },
}

const common = /* glsl */ `
uniform vec3 uEye;
uniform vec3 uDir;
uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uEdge0;
uniform float uEdge1;
uniform float uStrength;
uniform float uBlind;
varying vec3 vBuildPos;

float buildHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float builtAmount(vec3 p) {
  float d = distance(p, uEye);
  vec3 to = (p - uEye) / max(d, 1e-4);
  float byDist = 1.0 - smoothstep(uNear, uFar, d);
  float byGaze = smoothstep(uEdge0, uEdge1, dot(to, uDir));
  float near = 1.0 - smoothstep(3.0, 6.0, d);
  float b = max(min(byDist, byGaze), near);
  return mix(1.0, b, uStrength);
}
`

const vertexPos = /* glsl */ `
#include <project_vertex>
{
  vec4 bw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    bw = instanceMatrix * bw;
  #endif
  vBuildPos = (modelMatrix * bw).xyz;
}
`

/** Patches a lit fill material: cells dissolve where not built, the seam glows accent. */
export function patchFill<T extends Material>(m: T): T {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, buildUniforms)
    shader.vertexShader = `varying vec3 vBuildPos;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      vertexPos,
    )
    shader.fragmentShader = `${common}\nuniform vec3 uAccent;\n${shader.fragmentShader}`
      .replace(
        'void main() {',
        `void main() {
  vec3 cell = floor(vBuildPos * 1.6 + 0.001);
  float h = buildHash(cell);
  float built = builtAmount(vBuildPos);
  // Shimmer only along the seam; fully built surfaces stay whole.
  built += 0.035 * sin(uTime * 1.7 + h * 6.2831) * (1.0 - smoothstep(0.85, 1.0, built));
  if (h > built) discard;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
  if (h > built - 0.022 && built < 0.999) gl_FragColor.rgb = mix(gl_FragColor.rgb, uAccent, 0.8);`,
      )
  }
  m.customProgramCacheKey = () => 'build-fill'
  return m
}

/** Patches line materials: ink where built, light where only the drawing remains. */
export function patchLine<T extends Material>(m: T): T {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, buildUniforms)
    shader.vertexShader = `varying vec3 vBuildPos;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      vertexPos,
    )
    shader.fragmentShader = `${common}\nuniform vec3 uLineVoid;\n${shader.fragmentShader}`.replace(
      '#include <fog_fragment>',
      `float lb = builtAmount(vBuildPos) * (1.0 - uBlind);
  gl_FragColor.rgb = mix(uLineVoid, gl_FragColor.rgb, lb);
  gl_FragColor.a = mix(mix(0.55, 0.9, uBlind), gl_FragColor.a, lb);
  #include <fog_fragment>`,
    )
  }
  m.customProgramCacheKey = () => 'build-line'
  return m
}
