import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// GIR in his dog suit, built from primitives with flat two-tone toon shading and ink outlines.
// Idle: bobbing, derpy head tilt, blinking, wobbly antenna, dangling legs, wagging tail.
// His head follows the pointer. Click him for "duty mode" (red eyes + jump spin).

const COLORS = {
  metal: '#c2c2c2',
  metalDark: '#8a8a8a',
  eye: '#4cb89a',
  duty: '#ff2a3d',
  suit: '#9bd94f',
  suitLight: '#c6ec98',
  zipper: '#d2d4ca',
  ink: '#050505',
  white: '#ffffff',
  tongue: '#ff5577',
}
const LINE = 0.028

/* ------------------------------------------------------------------ */
/* Materials: shared ink (inverted hull) + crisp two-step toon ramp    */
/* ------------------------------------------------------------------ */

const toonRamp = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([150, 255]), 2, 1, THREE.RedFormat)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
})()

const inkMaterial = (() => {
  const m = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.inkThickness = { value: LINE }
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float inkThickness;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * inkThickness;')
  }
  return m
})()

// Outline copy of a geometry with welded, smoothed normals so hard edges don't split the hull.
function outlineOf(geo: THREE.BufferGeometry) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', geo.getAttribute('position').clone())
  if (geo.index) g.setIndex(geo.index.clone())
  const merged = mergeVertices(g, 1e-3)
  merged.computeVertexNormals()
  return merged
}

type PartProps = ThreeElements['group'] & {
  geo: THREE.BufferGeometry
  color: string
  ink?: boolean
  basic?: boolean
}

// A mesh with toon shading plus its ink outline.
function Part({ geo, color, ink = true, basic = false, ...props }: PartProps) {
  const outline = useMemo(() => (ink ? outlineOf(geo) : null), [geo, ink])
  return (
    <group {...props}>
      <mesh geometry={geo}>
        {basic ? <meshBasicMaterial color={color} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
      </mesh>
      {outline && <mesh geometry={outline} material={inkMaterial} />}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

type SuperShape = {
  w: number
  h: number
  d: number
  /** Vertical profile exponents: 2 = round, higher = boxier. */
  nTop: number
  nBot: number
  /** Cross-section exponents at the top and bottom. */
  xzTop: number
  xzBot: number
  /** Width multipliers at the top and bottom. */
  taperTop?: number
  taperBot?: number
}

// Superellipsoid with separate roundness and taper for its top and bottom halves.
// One smooth indexed mesh, so toon shadow edges and ink outlines stay clean.
function superShape(o: SuperShape, rings = 48, segs = 72) {
  const { w, h, d, nTop, nBot, xzTop, xzBot, taperTop = 1, taperBot = 1 } = o
  const sp = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= rings; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / rings
    const sin = Math.sin(phi)
    const cos = Math.max(Math.cos(phi), 0)
    const nv = sin >= 0 ? nTop : nBot
    const yn = sp(sin, 2 / nv)
    const rho = Math.pow(cos, 2 / nv)
    let k = (yn + 1) / 2
    k = k * k * (3 - 2 * k)
    const taper = THREE.MathUtils.lerp(taperBot, taperTop, k)
    const nxz = THREE.MathUtils.lerp(xzBot, xzTop, k)
    for (let j = 0; j < segs; j++) {
      const th = (2 * Math.PI * j) / segs
      pos.push((w / 2) * taper * rho * sp(Math.cos(th), 2 / nxz), (yn * h) / 2, (d / 2) * taper * rho * sp(Math.sin(th), 2 / nxz))
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * segs + j
      const b = i * segs + ((j + 1) % segs)
      idx.push(a, a + segs, b, b, a + segs, b + segs)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// Head: boxy on top with a clear front and side face, narrowing into a round chin, like the cartoon.
const makeHead = () =>
  superShape({ w: 1.45, h: 1.9, d: 1.2, nTop: 6, nBot: 2.3, xzTop: 5, xzBot: 2.6, taperBot: 0.8 })

// Tube along a curve that tapers from `r0` to `r1`.
function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 32, radial = 10) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false)
  const p = g.getAttribute('position')
  const c = new THREE.Vector3()
  const v = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    curve.getPointAt(t, c)
    const r = THREE.MathUtils.lerp(r0, r1, t)
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j
      v.fromBufferAttribute(p, idx).sub(c).normalize().multiplyScalar(r).add(c)
      p.setXYZ(idx, v.x, v.y, v.z)
    }
  }
  g.computeVertexNormals()
  return g
}

const ANTENNA_TIP = new THREE.Vector3(0.62, 0.78, -0.3)

const GEO = {
  head: makeHead(),
  neck: new THREE.CylinderGeometry(0.11, 0.11, 0.2, 16),
  eyeBase: new THREE.CylinderGeometry(0.36, 0.31, 0.26, 48),
  eyeRim: new THREE.CylinderGeometry(0.44, 0.38, 0.15, 48),
  lens: new THREE.CircleGeometry(0.42, 48),
  mouth: new THREE.CapsuleGeometry(0.014, 0.2, 4, 8),
  antenna: taperedTube(
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 0.55, -0.1), ANTENNA_TIP),
    0.07,
    0.022,
  ),
  antennaTip: new THREE.SphereGeometry(0.085, 20, 16),
  body: superShape({ w: 0.86, h: 0.95, d: 0.74, nTop: 5, nBot: 5, xzTop: 4.5, xzBot: 4.5, taperTop: 0.78, taperBot: 1.08 }, 32, 56),
  zipTooth: new THREE.BoxGeometry(0.05, 0.014, 0.01),
  collar: new THREE.TorusGeometry(0.24, 0.07, 12, 32),
  zipper: new RoundedBoxGeometry(0.09, 0.58, 0.04, 2, 0.015),
  zipPull: new RoundedBoxGeometry(0.11, 0.16, 0.03, 2, 0.012),
  pocket: new THREE.CircleGeometry(0.1, 24),
  sleeve: new THREE.CapsuleGeometry(0.085, 0.24, 6, 16),
  cuff: new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20),
  hand: new THREE.SphereGeometry(0.095, 20, 16),
  thumb: new THREE.CapsuleGeometry(0.035, 0.06, 4, 10),
  hood: new RoundedBoxGeometry(1.15, 0.85, 1.0, 4, 0.26),
  hoodOpening: new THREE.CircleGeometry(0.36, 32),
  hoodRim: new THREE.TorusGeometry(0.37, 0.05, 10, 40),
  tongue: new RoundedBoxGeometry(0.2, 0.05, 0.24, 2, 0.02),
  dogEye: new THREE.SphereGeometry(0.34, 28, 20),
  dogPupil: new THREE.SphereGeometry(0.05, 12, 10),
  leg: new THREE.CylinderGeometry(0.08, 0.05, 0.34, 12),
  foot: new THREE.SphereGeometry(0.06, 12, 10),
  tail: taperedTube(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, -0.18, -0.25),
      new THREE.Vector3(0.12, -0.22, -0.6),
      new THREE.Vector3(0.35, -0.12, -0.85),
    ]),
    0.045,
    0.02,
  ),
}

const ANTENNA_TIP_INK = outlineOf(GEO.antennaTip)

/* ------------------------------------------------------------------ */
/* Character                                                         */
/* ------------------------------------------------------------------ */

const DUTY_S = 2.5
const JUMP_S = 0.9

export default function Gir() {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const antenna = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const glowMats = useRef<THREE.MeshStandardMaterial[]>([])
  const clickedAt = useRef(-Infinity)
  const nextBlink = useRef(2)

  const viewport = useThree((s) => s.viewport)
  const clock = useThree((s) => s.clock)
  // Sit to the right of the hero text on wide screens, centred and smaller on phones.
  const wide = viewport.width > 7
  const x = wide ? Math.min(viewport.width * 0.22, 2.2) : 0
  const scale = wide ? 0.82 : 0.6

  const target = useMemo(() => new THREE.Color(), [])
  const calm = useMemo(() => new THREE.Color(COLORS.eye), [])
  const duty = useMemo(() => new THREE.Color(COLORS.duty), [])

  useFrame(({ pointer }, delta) => {
    const t = clock.elapsedTime
    const k = 1 - Math.exp(-delta * 5)

    // Jump + spin after a click.
    const since = t - clickedAt.current
    const jumping = since >= 0 && since < JUMP_S
    const p = jumping ? since / JUMP_S : 0
    if (root.current) {
      root.current.position.y = Math.sin(t * 2) * 0.06 + (jumping ? Math.sin(Math.PI * p) * 0.6 : 0)
      root.current.rotation.y = -0.85 + (jumping ? p * Math.PI * 2 : 0)
    }

    // Head follows the pointer, with a goofy idle tilt layered on top.
    if (head.current) {
      head.current.rotation.y += (pointer.x * 0.6 + 0.3 - head.current.rotation.y) * k
      head.current.rotation.x += (-pointer.y * 0.3 - head.current.rotation.x) * k
      head.current.rotation.z = Math.sin(t * 1.3) * 0.1
    }

    if (antenna.current) antenna.current.rotation.z = Math.sin(t * 6) * 0.12
    if (tail.current) tail.current.rotation.y = Math.sin(t * 9) * 0.5
    if (legL.current) legL.current.rotation.x = Math.sin(t * 3) * 0.3
    if (legR.current) legR.current.rotation.x = Math.sin(t * 3 + Math.PI) * 0.3

    // Arms: dangle and swing while idle, fly up during the jump, right arm waves in duty mode.
    const inDuty = since >= 0 && since < DUTY_S
    const jumpLift = jumping ? Math.sin(Math.PI * p) * 2.3 : 0
    for (const [arm, s, phase] of [
      [armL.current, -1, 0],
      [armR.current, 1, Math.PI],
    ] as const) {
      if (!arm) continue
      const waving = s === 1 && inDuty && !jumping
      const z = waving ? 2.6 + Math.sin(t * 14) * 0.35 : 0.25 + Math.sin(t * 2 + phase) * 0.06 + jumpLift
      const x = waving ? 0 : Math.sin(t * 3 + phase) * 0.25
      arm.rotation.z += (s * z - arm.rotation.z) * (1 - Math.exp(-delta * 12))
      arm.rotation.x += (x - arm.rotation.x) * k
    }

    // Blink every few seconds.
    if (eyes.current) {
      if (t > nextBlink.current + 0.12) nextBlink.current = t + 2 + Math.random() * 3
      const blinking = t > nextBlink.current
      eyes.current.scale.y += ((blinking ? 0.1 : 1) - eyes.current.scale.y) * (1 - Math.exp(-delta * 30))
    }

    // Eye glow: calm teal, or red in duty mode.
    target.copy(inDuty ? duty : calm)
    for (const m of glowMats.current) {
      m.color.lerp(target, k)
      m.emissive.lerp(target, k)
      m.emissiveIntensity = (inDuty ? 1.1 : 0.35) + Math.sin(t * 3) * 0.1
    }
  })

  const glow = (i: number) => (m: THREE.MeshStandardMaterial | null) => {
    if (m) glowMats.current[i] = m
  }
  const setCursor = (c: string) => () => (document.body.style.cursor = c)

  const legs = [
    [legL, -0.2],
    [legR, 0.19],
  ] as const satisfies readonly (readonly [RefObject<THREE.Group | null>, number])[]
  const arms = [
    [armL, -1],
    [armR, 1],
  ] as const satisfies readonly (readonly [RefObject<THREE.Group | null>, number])[]

  return (
    <group position={[x, -0.5, 0]} scale={scale}>
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation()
          clickedAt.current = clock.elapsedTime
        }}
        onPointerOver={setCursor('pointer')}
        onPointerOut={setCursor('auto')}
      >
        {/* ---------- Body (dog suit) ---------- */}
        <Part geo={GEO.body} color={COLORS.suit} position={[0, -0.5, 0]} />
        <Part geo={GEO.collar} color={COLORS.suitLight} position={[0, -0.03, 0.02]} rotation={[Math.PI / 2 - 0.15, 0, 0]} />
        {/* Zipper with teeth; the suit front leans back slightly, so these follow its slope. */}
        <group position={[-0.14, -0.5, 0.352]} rotation={[-0.1, 0, 0]}>
          <Part geo={GEO.zipper} color={COLORS.zipper} />
          {[-0.2, -0.12, -0.04, 0.04, 0.12, 0.2].map((y) => (
            <Part key={y} geo={GEO.zipTooth} color={COLORS.ink} ink={false} basic position={[0.02, y, 0.022]} />
          ))}
        </group>
        <Part geo={GEO.zipPull} color={COLORS.zipper} position={[-0.16, -0.14, 0.36]} rotation={[0.2, 0, 0.5]} />
        <Part geo={GEO.pocket} color={COLORS.ink} ink={false} basic position={[0.15, -0.52, 0.36]} rotation={[-0.1, 0, 0]} scale={[0.75, 1.4, 1]} />

        {/* ---------- Arms (green sleeves, little grey mitts) ---------- */}
        {arms.map(([ref, s]) => (
          <group key={s} ref={ref} position={[s * 0.37, -0.16, 0.02]} rotation={[0, 0, s * 0.25]}>
            <Part geo={GEO.sleeve} color={COLORS.suit} position={[0, -0.2, 0]} />
            <Part geo={GEO.cuff} color={COLORS.suitLight} position={[0, -0.36, 0]} />
            <Part geo={GEO.hand} color={COLORS.metal} position={[0, -0.45, 0]} />
            <Part geo={GEO.thumb} color={COLORS.metal} position={[s * -0.06, -0.42, 0.06]} rotation={[0.5, 0, s * 0.6]} />
          </group>
        ))}

        {/* ---------- Hood (the dog head, pulled back) ---------- */}
        {/* Opening faces forward-up (where his head would go), so it peeks out beside the head. */}
        <group position={[0.05, 0.1, -0.66]} rotation={[-0.75, 0, 0]}>
          <Part geo={GEO.hood} color={COLORS.suit} />
          <Part geo={GEO.hoodOpening} color={COLORS.ink} ink={false} basic position={[0.02, 0.02, 0.502]} scale={[1.3, 0.95, 1]} />
          <Part geo={GEO.hoodRim} color={COLORS.suitLight} position={[0.02, 0.02, 0.5]} scale={[1.3, 0.95, 1]} />
          <Part geo={GEO.tongue} color={COLORS.tongue} position={[0.4, 0.22, 0.5]} rotation={[1.3, 0.35, -0.2]} />
          {/* Big googly dog eyes on the sides */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.6, -0.02, -0.18]}>
              <Part geo={GEO.dogEye} color={COLORS.white} scale={[0.6, 1, 0.9]} />
              <Part geo={GEO.dogPupil} color={COLORS.ink} ink={false} basic position={[s * 0.19, 0.08, 0.1]} scale={[0.5, 1.4, 1]} />
            </group>
          ))}
        </group>

        {/* ---------- Tail ---------- */}
        <group ref={tail} position={[0.05, -0.86, -0.32]}>
          <Part geo={GEO.tail} color={COLORS.ink} basic ink={false} />
        </group>

        {/* ---------- Legs ---------- */}
        {legs.map(([ref, lx]) => (
          <group key={lx} ref={ref} position={[lx, -0.9, 0.04]}>
            <Part geo={GEO.leg} color={COLORS.ink} basic ink={false} position={[0, -0.17, 0]} />
            <Part geo={GEO.foot} color={COLORS.ink} basic ink={false} position={[0, -0.34, 0]} />
          </group>
        ))}

        {/* ---------- Head (pivots at the neck) ---------- */}
        <group ref={head} position={[0, 0.0, 0.05]}>
          <Part geo={GEO.neck} color={COLORS.metalDark} ink={false} position={[0, 0.02, 0]} />
          <Part geo={GEO.head} color={COLORS.metal} position={[0, 0.98, 0]} />

          {/* Eyes: flared, two-segment tubes that stick out of the face, with glowing lenses */}
          <group ref={eyes} position={[0, 0.72, 0]}>
            {[-1, 1].map((s, i) => (
              <group key={s} position={[s * 0.44, 0, 0.4]} rotation={[0, s * 0.6, 0]}>
                <Part geo={GEO.eyeBase} color={COLORS.metalDark} position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]} />
                <Part geo={GEO.eyeRim} color={COLORS.metal} position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={GEO.lens} position={[0, 0, 0.327]}>
                  <meshStandardMaterial ref={glow(i)} color={COLORS.eye} emissive={COLORS.eye} emissiveIntensity={0.35} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Little mouth line */}
          <Part geo={GEO.mouth} color={COLORS.ink} ink={false} basic position={[-0.06, 0.3, 0.385]} rotation={[-0.75, 0, Math.PI / 2 + 0.12]} />

          {/* Antenna */}
          <group ref={antenna} position={[0.32, 1.88, -0.2]}>
            <Part geo={GEO.antenna} color={COLORS.metalDark} />
            <group position={ANTENNA_TIP}>
              <mesh geometry={GEO.antennaTip}>
                <meshStandardMaterial ref={glow(2)} color={COLORS.eye} emissive={COLORS.eye} emissiveIntensity={0.35} />
              </mesh>
              <mesh geometry={ANTENNA_TIP_INK} material={inkMaterial} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
