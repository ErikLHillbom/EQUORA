// Owner feedback on detected changes: the human answer the tag cannot give itself (SPEC 7).
// Stored on the phone in IndexedDB, one record per change id, so it survives a reload and
// works offline. Nothing leaves the phone.
import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { FeedbackId } from '../shared/types'

export const FEEDBACK_DB = 'equid-sentinel-feedback'
export const FEEDBACK_IDS: readonly FeedbackId[] = ['fine', 'not_eating', 'called_help', 'treated']

export interface FeedbackRecord {
  changeId: string
  animalId: string
  feedback: FeedbackId
  /** When the answer was recorded on this phone, epoch ms. */
  at: number
}

interface Schema extends DBSchema {
  feedback: {
    key: string
    value: FeedbackRecord
    indexes: { animalId: string }
  }
}

export interface FeedbackStore {
  record(r: FeedbackRecord): Promise<void>
  get(changeId: string): Promise<FeedbackRecord | undefined>
  /** Every answer recorded for one animal. */
  forAnimal(animalId: string): Promise<FeedbackRecord[]>
  close(): void
}

export function isFeedbackId(v: unknown): v is FeedbackId {
  return typeof v === 'string' && (FEEDBACK_IDS as readonly string[]).includes(v)
}

export function createFeedbackStore(dbName: string = FEEDBACK_DB): FeedbackStore {
  let dbp: Promise<IDBPDatabase<Schema>> | null = null
  const db = () =>
    (dbp ??= openDB<Schema>(dbName, 1, {
      upgrade(d) {
        const s = d.createObjectStore('feedback', { keyPath: 'changeId' })
        s.createIndex('animalId', 'animalId')
      },
    }))
  return {
    async record(r) {
      if (!isFeedbackId(r.feedback)) throw new Error(`Unknown feedback ${String(r.feedback)}`)
      await (await db()).put('feedback', r)
    },
    async get(changeId) {
      return (await db()).get('feedback', changeId)
    },
    async forAnimal(animalId) {
      return (await db()).getAllFromIndex('feedback', 'animalId', animalId)
    },
    close() {
      if (dbp) void dbp.then((d) => d.close())
      dbp = null
    },
  }
}

let shared: FeedbackStore | null = null

/** The app's one feedback store. */
export function feedbackStore(): FeedbackStore {
  return (shared ??= createFeedbackStore())
}
