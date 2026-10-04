// Manifest for the 3D ink animals. No three.js here: this file is read before the 3D chunk
// loads, to decide whether to load it at all.
import type { Pose, Species } from '../shared/types'

export type ModelSpecies = 'horse' | 'donkey'
/** Poses the 3D scene can draw: every pose the app shows. Rolling is never drawn. */
export type ScenePose = Pose

export const SCENE_POSES: readonly ScenePose[] = ['standing', 'walking', 'trotting', 'grazing', 'lying']

export interface PoseClip {
  /** Clip name inside the GLB. Lying has no clip: it is built in code from the standing clip. */
  clip: string
  /** Time in seconds of the frame the still shows, and where every transition ends. */
  at: number
}

export interface ModelEntry {
  url: string
  poses: Record<ScenePose, PoseClip>
}

const base = import.meta.env.BASE_URL ?? '/'

// Quaternius "Ultimate Animated Animal Pack" (CC0). Clips kept: Idle, Idle_Headlow, Walk,
// Eating. Attack, death, jump, gallop and hit clips are removed from the files.
const QUATERNIUS_POSES: Record<ScenePose, PoseClip> = {
  standing: { clip: 'Idle', at: 0 },
  walking: { clip: 'Walk', at: 0.29 },
  // There is no trot clip (the gallop was removed from the file). The walk at the moment a
  // diagonal pair of legs swings forward reads as a calm trot.
  trotting: { clip: 'Walk', at: 0.88 },
  grazing: { clip: 'Eating', at: 2.5 },
  lying: { clip: 'Idle', at: 0 },
}

export const MODELS: Record<ModelSpecies, ModelEntry> = {
  horse: { url: `${base}models3d/horse.glb`, poses: QUATERNIUS_POSES },
  donkey: { url: `${base}models3d/donkey.glb`, poses: QUATERNIUS_POSES },
}

/** Mules use the donkey model (DESIGN 7, decisions.md). */
export function modelSpecies(species: Species): ModelSpecies {
  return species === 'horse' ? 'horse' : 'donkey'
}

/** Rolling is never drawn; the shared types already map it to lying. */
export function scenePose(pose: Pose): ScenePose {
  return pose
}

/**
 * Pencil drawing of the same pose, rendered from the 3D scene by scripts/render-drawings.ts.
 * PostureDrawing shows these, and the 3D scene shows one while it loads and on low-end phones.
 */
export function stillUrl(species: Species, pose: Pose): string {
  return `${base}models3d/stills/${modelSpecies(species)}-${scenePose(pose)}.webp`
}

interface NavigatorHints {
  deviceMemory?: number
  hardwareConcurrency?: number
  connection?: { saveData?: boolean }
}

/**
 * True when this phone should get the 3D scene: WebGL2 works, the owner has not asked to
 * save data, and the phone has at least 2 GB of memory and 4 cores where it tells us.
 */
export function canUse3D(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const nav = navigator as Navigator & NavigatorHints
  if (nav.connection?.saveData) return false
  if (window.matchMedia?.('(prefers-reduced-data: reduce)').matches) return false
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 2) return false
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency < 4) return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
