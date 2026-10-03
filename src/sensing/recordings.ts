// Labelled recordings made in the Tag screen recorder. Stored on the phone in IndexedDB and
// forwarded later (store and forward, SPEC 7). Data never leaves the phone unless sent.

import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { Activity, ImuWindow } from '../shared/types.ts'
import { decodeWindows, encodeWindows } from './replay.ts'

export const RECORDINGS_DB = 'equid-sensing'
const SCALE = 1000

export interface RecordingMeta {
  id: string
  /** What the person saw the animal do. */
  label: Activity
  animalId?: string
  note?: string
  createdAt: number
  /** Epoch ms of the first window. */
  start: number
  hz: number
  windowSamples: number
  windowCount: number
  /** Set once the recording has been forwarded. */
  sentAt?: number
}

interface StoredRecording extends RecordingMeta {
  /** int16le milli-g, per window ax then ay then az (as public/replay). */
  data: ArrayBuffer
}

interface Schema extends DBSchema {
  recordings: { key: string; value: StoredRecording; indexes: { createdAt: number } }
}

export interface RecordingExport {
  format: 'equid-sentinel-recordings'
  version: 1
  encoding: string
  exportedAt: number
  recordings: (RecordingMeta & { data: string })[]
}

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(s: string): ArrayBuffer {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

function meta(r: StoredRecording): RecordingMeta {
  const { data: _data, ...m } = r
  return m
}

export interface RecordingStore {
  save(input: { label: Activity; windows: ImuWindow[]; animalId?: string; note?: string; now?: number }): Promise<RecordingMeta>
  /** Newest first, without the samples. */
  list(): Promise<RecordingMeta[]>
  get(id: string): Promise<{ meta: RecordingMeta; windows: ImuWindow[] } | undefined>
  remove(id: string): Promise<void>
  /** Recordings not yet forwarded. */
  pending(): Promise<RecordingMeta[]>
  markSent(ids: string[], at?: number): Promise<void>
  /** Hand pending recordings to `send`; mark them sent only if it resolves. Returns how many. */
  forward(send: (payload: RecordingExport) => Promise<void>, now?: number): Promise<number>
  /** JSON export of the given recordings, or all of them. */
  exportJson(ids?: string[], now?: number): Promise<string>
  close(): void
}

export function createRecordingStore(dbName: string = RECORDINGS_DB): RecordingStore {
  let dbp: Promise<IDBPDatabase<Schema>> | null = null
  const db = () =>
    (dbp ??= openDB<Schema>(dbName, 1, {
      upgrade(d) {
        const s = d.createObjectStore('recordings', { keyPath: 'id' })
        s.createIndex('createdAt', 'createdAt')
      },
    }))

  async function exportPayload(ids: string[] | undefined, now: number): Promise<RecordingExport> {
    const all = await (await db()).getAll('recordings')
    const chosen = ids ? all.filter((r) => ids.includes(r.id)) : all
    return {
      format: 'equid-sentinel-recordings',
      version: 1,
      encoding: 'base64 of int16le milli-g, per window ax[n] then ay[n] then az[n]',
      exportedAt: now,
      recordings: chosen.sort((a, b) => a.createdAt - b.createdAt).map((r) => ({ ...meta(r), data: toBase64(r.data) })),
    }
  }

  const store: RecordingStore = {
    async save({ label, windows, animalId, note, now = Date.now() }) {
      if (windows.length === 0) throw new Error('A recording needs at least one window')
      const n = windows[0].ax.length
      if (windows.some((w) => w.ax.length !== n)) throw new Error('Windows differ in length')
      const rec: StoredRecording = {
        id: newId(),
        label,
        animalId,
        note,
        createdAt: now,
        start: windows[0].start,
        hz: windows[0].hz,
        windowSamples: n,
        windowCount: windows.length,
        data: encodeWindows(windows, SCALE),
      }
      await (await db()).put('recordings', rec)
      return meta(rec)
    },
    async list() {
      const all = await (await db()).getAllFromIndex('recordings', 'createdAt')
      return all.reverse().map(meta)
    },
    async get(id) {
      const r = await (await db()).get('recordings', id)
      if (!r) return undefined
      return {
        meta: meta(r),
        windows: decodeWindows(r.data, { hz: r.hz, windowSamples: r.windowSamples, scale: SCALE, start: r.start }),
      }
    },
    async remove(id) {
      await (await db()).delete('recordings', id)
    },
    async pending() {
      return (await store.list()).filter((r) => r.sentAt === undefined)
    },
    async markSent(ids, at = Date.now()) {
      const tx = (await db()).transaction('recordings', 'readwrite')
      for (const id of ids) {
        const r = await tx.store.get(id)
        if (r) await tx.store.put({ ...r, sentAt: at })
      }
      await tx.done
    },
    async forward(send, now = Date.now()) {
      const ids = (await store.pending()).map((r) => r.id)
      if (ids.length === 0) return 0
      await send(await exportPayload(ids, now))
      await store.markSent(ids, now)
      return ids.length
    },
    async exportJson(ids, now = Date.now()) {
      return JSON.stringify(await exportPayload(ids, now))
    },
    close() {
      if (dbp) void dbp.then((d) => d.close())
      dbp = null
    },
  }
  return store
}

/** Decode one recording from an export back into windows. */
export function windowsFromExport(r: RecordingExport['recordings'][number]): ImuWindow[] {
  return decodeWindows(fromBase64(r.data), { hz: r.hz, windowSamples: r.windowSamples, scale: SCALE, start: r.start })
}
