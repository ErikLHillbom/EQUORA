// The 3D ink animal on the home screen. Lazy-load this file: it pulls in three.js.
// One fixed three-quarter view, no camera motion. Frames render only when the pose changes,
// then the scene holds still (SPEC 8: no decorative animation).
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AnimationMixer,
  BufferAttribute,
  Box3,
  Color,
  DepthTexture,
  Group,
  Matrix4,
  Mesh,
  MeshNormalMaterial,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  SkinnedMesh,
  UnsignedIntType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type AnimationAction,
  type Object3D,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import type { Pose, Species } from '../shared/types'
import {
  createInkUniforms,
  createPencilUniforms,
  createShadowUniforms,
  INK,
  inkFragmentShader,
  inkVertexShader,
  pencilFragmentShader,
  pencilVertexShader,
  rawColor,
  shadowFragmentShader,
  shadowVertexShader,
  type PencilUniforms,
} from './ink/inkShader'
import { smoothNormals } from './ink/smoothNormals'
import { LYING_POSE } from './ink/lyingPose'
import { MODELS, modelSpecies, scenePose, stillUrl, type ScenePose } from './models'

export interface HorseSceneProps {
  species: Species
  pose: Pose
  /** Line colour. Defaults to ink. Pass a state ink only when the animal departs from normal. */
  stateInk?: string
  /** Accessible description, e.g. "Mulu, grazing". */
  label?: string
  className?: string
}

const TRANSITION_S = 0.9
const BODY_LENGTH = 2
const CAMERA_POSITION: [number, number, number] = [3.25, 1.45, 3.52]
const CAMERA_TARGET = new Vector3(-0.1, 0.74, 0.03)

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Turns the baked material colours into pencil tone, 1 being bare paper. The coat (the most
 * common colour) is 1, so only light and form put hatching on it. Darker parts (mane, tail,
 * hooves, eyes) get darker in proportion, so they carry more layers of hatching, never a fill.
 * The pencil shader reads the value as it is.
 */
function toneVertexColours(mesh: SkinnedMesh) {
  const geo = mesh.geometry
  if (geo.userData.inkTone) return
  const attr = geo.getAttribute('color') as BufferAttribute | undefined
  if (!attr) return
  const lum = new Float32Array(attr.count)
  const counts = new Map<number, number>()
  const c = new Color()
  for (let i = 0; i < attr.count; i++) {
    c.setRGB(attr.getX(i), attr.getY(i), attr.getZ(i)).convertLinearToSRGB()
    const l = Math.round((0.299 * c.r + 0.587 * c.g + 0.114 * c.b) * 100) / 100
    lum[i] = l
    counts.set(l, (counts.get(l) ?? 0) + 1)
  }
  let coat = 0
  let most = 0
  for (const [l, n] of counts) {
    if (n > most) {
      most = n
      coat = l
    }
  }
  const values = new Float32Array(attr.count * 3)
  for (let i = 0; i < attr.count; i++) {
    const tone = Math.min(1, Math.max(0.3, 1 - 2.4 * (coat - lum[i])))
    values.fill(tone, i * 3, i * 3 + 3)
  }
  geo.setAttribute('color', new BufferAttribute(values, 3))
  geo.userData.inkTone = true
}

interface Foot {
  leg: Object3D
  foot: Object3D
  fold: number
  /** Hoof relative to its lower leg in the standing pose. */
  offset: Matrix4
  restPosition: Vector3
  restQuaternion: Quaternion
}

interface Rig {
  root: Group
  model: Object3D
  material: ShaderMaterial & { uniforms: PencilUniforms }
  mixer: AnimationMixer
  actions: Map<string, AnimationAction>
  bones: Map<string, Object3D>
  /** Rest rotation of every bone the lying pose turns, so turns never add up across frames. */
  rest: Map<string, Quaternion>
  feet: Foot[]
  standY: number
  /** How far the body comes down when lying, found by folding the legs once. */
  lyingDrop: number
}

function useRig(url: string): Rig {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
  const rig = useMemo<Rig>(() => {
    const model = cloneSkinned(gltf.scene)
    const material = new ShaderMaterial({
      uniforms: createPencilUniforms(),
      vertexShader: pencilVertexShader,
      fragmentShader: pencilFragmentShader,
      vertexColors: true,
      blending: NoBlending,
    }) as Rig['material']
    const bones = new Map<string, Object3D>()
    model.traverse((o) => {
      if (o instanceof SkinnedMesh) {
        toneVertexColours(o)
        smoothNormals(o.geometry)
        o.material = material
        o.frustumCulled = false
      }
      bones.set(o.name, o)
    })
    const rest = new Map<string, Quaternion>()
    for (const turn of LYING_POSE.turns) {
      const bone = bones.get(turn.bone)
      if (bone) rest.set(turn.bone, bone.quaternion.clone())
    }
    const mixer = new AnimationMixer(model)
    const actions = new Map<string, AnimationAction>()
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip))

    // Fit the animal: body length BODY_LENGTH, hooves on y = 0, centred.
    actions.get('Idle')?.play()
    mixer.update(0)
    model.updateMatrixWorld(true)
    const box = new Box3().setFromObject(model, true)
    const size = box.getSize(new Vector3())
    const scale = BODY_LENGTH / Math.max(size.x, size.z)
    model.scale.multiplyScalar(scale)
    const centre = box.getCenter(new Vector3()).multiplyScalar(scale)
    model.position.set(-centre.x, -box.min.y * scale, -centre.z)

    model.updateMatrixWorld(true)
    const feet: Foot[] = []
    for (const { leg: legName, foot: footName, fold } of LYING_POSE.feet) {
      const leg = bones.get(legName)
      const foot = bones.get(footName)
      if (!leg || !foot) continue
      const offset = new Matrix4().copy(leg.matrixWorld).invert().multiply(foot.matrixWorld)
      feet.push({ leg, foot, fold, offset, restPosition: foot.position.clone(), restQuaternion: foot.quaternion.clone() })
    }
    const standY = model.position.y
    const partial: Rig = { root: new Group(), model, material, mixer, actions, bones, rest, feet, standY, lyingDrop: 0 }
    // Fold the legs once to measure how far the body must come down to rest on the ground.
    applyLying(partial, 1)
    model.updateMatrixWorld(true)
    const lying = new Box3().setFromObject(model, true)
    partial.lyingDrop = Math.max(0, lying.min.y)
    resetTurns(partial)
    mixer.stopAllAction()
    model.position.y = standY

    partial.root.add(model)
    return partial
  }, [gltf])
  // No mixer.stopAllAction() here. Stopping the last action puts every animated bone back to its
  // rest state, and under StrictMode this cleanup runs while the same rig stays on screen: the
  // body stayed lowered but the legs stood straight again, so "lying" came out as an animal sunk
  // into the ground. The mixer goes away with the rig.
  useEffect(() => () => rig.material.dispose(), [rig])
  return rig
}

const tmpQ = new Quaternion()
const tmpAxis = new Vector3()
const tmpM = new Matrix4()
const tmpP = new Vector3()
const tmpS = new Vector3()

/** Call before every mixer.update: bones the clip does not drive go back to rest. */
function resetTurns(rig: Rig) {
  for (const [name, q] of rig.rest) rig.bones.get(name)?.quaternion.copy(q)
  for (const f of rig.feet) {
    f.foot.position.copy(f.restPosition)
    f.foot.quaternion.copy(f.restQuaternion)
  }
}

function applyLying(rig: Rig, w: number) {
  rig.model.position.y = rig.standY - rig.lyingDrop * w
  if (w <= 0) return
  for (const turn of LYING_POSE.turns) {
    const bone = rig.bones.get(turn.bone)
    if (!bone) continue
    tmpAxis.set(...turn.axis).normalize()
    tmpQ.setFromAxisAngle(tmpAxis, turn.angle * w)
    bone.quaternion.multiply(tmpQ)
  }
  // Hooves follow the folded legs.
  rig.model.updateMatrixWorld(true)
  for (const f of rig.feet) {
    const parent = f.foot.parent
    if (!parent) continue
    tmpM.copy(parent.matrixWorld).invert().multiply(f.leg.matrixWorld).multiply(f.offset)
    tmpM.decompose(tmpP, tmpQ, tmpS)
    f.foot.position.lerp(tmpP, w)
    f.foot.quaternion.slerp(tmpQ, w)
    tmpQ.setFromAxisAngle(tmpAxis.set(1, 0, 0), f.fold * w)
    f.foot.quaternion.multiply(tmpQ)
  }
}

interface Transition {
  from: AnimationAction | null
  to: AnimationAction
  lieFrom: number
  lieTo: number
  elapsed: number
}

function InkAnimal({
  species,
  pose,
  stateInk,
  onReady,
}: {
  species: 'horse' | 'donkey'
  pose: ScenePose
  stateInk: string
  onReady: () => void
}) {
  const entry = MODELS[species]
  const rig = useRig(entry.url)
  const { gl, scene, camera, invalidate, size } = useThree()
  const reduced = useMemo(prefersReducedMotion, [])

  const passes = useMemo(() => {
    const depthTexture = new DepthTexture(1, 1, UnsignedIntType)
    const colorRT = new WebGLRenderTarget(1, 1, { depthTexture })
    const normalRT = new WebGLRenderTarget(1, 1)
    const normalMaterial = new MeshNormalMaterial()
    const uniforms = createInkUniforms(INK)
    const inkMaterial = new ShaderMaterial({
      uniforms,
      vertexShader: inkVertexShader,
      fragmentShader: inkFragmentShader,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new Mesh(new PlaneGeometry(2, 2), inkMaterial)
    quad.frustumCulled = false
    const quadScene = new Scene()
    quadScene.add(quad)
    const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const shadowUniforms = createShadowUniforms()
    const shadow = new Mesh(
      new PlaneGeometry(BODY_LENGTH * 1.05, BODY_LENGTH * 0.46),
      new ShaderMaterial({
        uniforms: shadowUniforms,
        vertexShader: shadowVertexShader,
        fragmentShader: shadowFragmentShader,
        blending: NoBlending,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.001
    shadow.renderOrder = -1
    return { colorRT, normalRT, depthTexture, normalMaterial, uniforms, shadowUniforms, inkMaterial, quad, quadScene, quadCamera, shadow }
  }, [])

  useEffect(
    () => () => {
      passes.colorRT.dispose()
      passes.normalRT.dispose()
      passes.depthTexture.dispose()
      passes.normalMaterial.dispose()
      passes.inkMaterial.dispose()
      passes.quad.geometry.dispose()
      passes.shadow.geometry.dispose()
      ;(passes.shadow.material as ShaderMaterial).dispose()
    },
    [passes],
  )

  useLayoutEffect(() => {
    // No lights: the pencil shader lights the animal itself.
    scene.add(rig.root)
    scene.add(passes.shadow)
    camera.lookAt(CAMERA_TARGET)
    return () => {
      scene.remove(rig.root, passes.shadow)
    }
  }, [scene, rig, passes, camera])

  useEffect(() => {
    passes.uniforms.uLine.value = rawColor(stateInk)
    invalidate()
  }, [stateInk, passes, invalidate])

  // Pose handling. The first pose is set directly; later changes cross-fade.
  const current = useRef<{ pose: ScenePose; action: AnimationAction; lie: number } | null>(null)
  const transition = useRef<Transition | null>(null)
  const readySent = useRef(false)

  const settle = (target: ScenePose) => {
    const { clip, at } = entry.poses[target]
    const action = rig.actions.get(clip) ?? rig.actions.get('Idle')
    if (!action) return
    rig.mixer.stopAllAction()
    action.reset().setEffectiveWeight(1).play()
    action.time = at
    action.paused = true
    resetTurns(rig)
    rig.mixer.update(0)
    const lie = target === 'lying' ? 1 : 0
    applyLying(rig, lie)
    current.current = { pose: target, action, lie }
    transition.current = null
  }

  useLayoutEffect(() => {
    const prev = current.current
    if (!prev) {
      settle(pose)
      invalidate()
      return
    }
    if (prev.pose === pose) {
      // Same pose again (StrictMode runs effects twice): set it once more so no stale bone state shows.
      if (!transition.current) {
        settle(pose)
        invalidate()
      }
      return
    }
    if (reduced) {
      settle(pose)
      invalidate()
      return
    }
    const { clip, at } = entry.poses[pose]
    const to = rig.actions.get(clip) ?? rig.actions.get('Idle')
    if (!to) return
    const from = prev.action
    from.paused = false
    if (to !== from) {
      to.reset().play()
      const d = to.getClip().duration
      to.time = (((at - TRANSITION_S) % d) + d) % d
      to.crossFadeFrom(from, TRANSITION_S, false)
    } else {
      to.time = (((at - TRANSITION_S) % to.getClip().duration) + to.getClip().duration) % to.getClip().duration
    }
    transition.current = { from, to, lieFrom: prev.lie, lieTo: pose === 'lying' ? 1 : 0, elapsed: 0 }
    current.current = { pose, action: to, lie: prev.lie }
    invalidate()
    // settle and entry are stable for a given rig; pose is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose, rig, reduced])

  const bufferSize = useMemo(() => new Vector2(), [])

  useFrame((state, delta) => {
    const t = transition.current
    if (t) {
      const dt = Math.min(delta, 1 / 20)
      t.elapsed += dt
      resetTurns(rig)
      rig.mixer.update(dt)
      const k = Math.min(1, t.elapsed / TRANSITION_S)
      const e = k * k * (3 - 2 * k)
      const lie = t.lieFrom + (t.lieTo - t.lieFrom) * e
      applyLying(rig, lie)
      if (current.current) current.current.lie = lie
      if (k >= 1) settle(current.current?.pose ?? pose)
      else invalidate()
    }

    gl.getDrawingBufferSize(bufferSize)
    const w = Math.max(1, Math.floor(bufferSize.x))
    const h = Math.max(1, Math.floor(bufferSize.y))
    if (passes.colorRT.width !== w || passes.colorRT.height !== h) {
      passes.colorRT.setSize(w, h)
      passes.normalRT.setSize(w, h)
    }
    const u = passes.uniforms
    u.uResolution.value.set(w, h)
    u.uPx.value = state.viewport.dpr
    rig.material.uniforms.uPx.value = state.viewport.dpr
    rig.material.uniforms.uBufferHeight.value = h
    passes.shadowUniforms.uPx.value = state.viewport.dpr
    u.uNear.value = (camera as { near: number }).near
    u.uFar.value = (camera as { far: number }).far
    u.tColor.value = passes.colorRT.texture
    u.tDepth.value = passes.depthTexture
    u.tNormal.value = passes.normalRT.texture

    const clear = gl.getClearColor(new Color())
    const clearAlpha = gl.getClearAlpha()

    // Pencil pass: stroke coverage in red, nothing (0) around the animal.
    passes.shadow.visible = true
    gl.setRenderTarget(passes.colorRT)
    gl.setClearColor(0x000000, 0)
    gl.clear()
    gl.render(scene, camera)

    passes.shadow.visible = false
    scene.overrideMaterial = passes.normalMaterial
    gl.setRenderTarget(passes.normalRT)
    gl.setClearColor(new Color(0.5, 0.5, 1), 1)
    gl.clear()
    gl.render(scene, camera)
    scene.overrideMaterial = null
    passes.shadow.visible = true

    gl.setRenderTarget(null)
    gl.setClearColor(clear, clearAlpha)
    gl.clear()
    gl.render(passes.quadScene, passes.quadCamera)

    if (!readySent.current && !transition.current) {
      readySent.current = true
      onReady()
    }
  }, 1)

  // Keep the aspect right when the box changes size.
  useEffect(() => invalidate(), [size.width, size.height, invalidate])

  return null
}

export default function HorseScene({ species, pose, stateInk = INK, label, className }: HorseSceneProps) {
  const [ready, setReady] = useState(false)
  const which = modelSpecies(species)
  const target = scenePose(pose)
  const still = stillUrl(species, pose)
  return (
    <div
      className={className}
      role="img"
      aria-label={label}
      data-ready={ready ? 'true' : 'false'}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {!ready && (
        <img
          src={still}
          alt=""
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
      <Canvas
        frameloop="demand"
        // Always 2x, so lines a pixel wide stay crisp once the browser scales the canvas down.
        dpr={2}
        flat
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: false }}
        camera={{ fov: 25, near: 0.1, far: 20, position: CAMERA_POSITION }}
        style={{ position: 'absolute', inset: 0, opacity: ready ? 1 : 0 }}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <InkAnimal key={which} species={which} pose={target} stateInk={stateInk} onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>
    </div>
  )
}
