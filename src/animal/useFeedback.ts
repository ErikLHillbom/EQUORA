import { useCallback, useEffect, useState } from 'react'
import type { FeedbackId } from '../shared/types'
import { feedbackStore, type FeedbackRecord } from './feedback'

export interface FeedbackState {
  /** Answers recorded on this phone, by change id. */
  saved: Record<string, FeedbackRecord>
  /** True once the stored answers have loaded (or failed to). */
  ready: boolean
  record: (changeId: string, feedback: FeedbackId) => Promise<void>
}

/** Owner answers for one animal's detected changes, read from and written to IndexedDB. */
export function useFeedback(animalId: string, clock: () => number = Date.now): FeedbackState {
  const [loaded, setLoaded] = useState<{ animalId: string; saved: Record<string, FeedbackRecord> } | null>(null)
  const [added, setAdded] = useState<Record<string, FeedbackRecord>>({})

  useEffect(() => {
    let alive = true
    feedbackStore()
      .forAnimal(animalId)
      .then((list) => {
        if (alive) setLoaded({ animalId, saved: Object.fromEntries(list.map((r) => [r.changeId, r])) })
      })
      .catch(() => {
        // Storage can be blocked (private mode). Answers then last for this visit only.
        if (alive) setLoaded({ animalId, saved: {} })
      })
    return () => {
      alive = false
    }
  }, [animalId])

  const record = useCallback(
    async (changeId: string, feedback: FeedbackId) => {
      const rec: FeedbackRecord = { changeId, animalId, feedback, at: clock() }
      setAdded((m) => ({ ...m, [changeId]: rec }))
      try {
        await feedbackStore().record(rec)
      } catch {
        // Kept in memory for this visit when storage is blocked.
      }
    },
    [animalId, clock],
  )

  const current = loaded?.animalId === animalId ? loaded.saved : {}
  const mine = Object.fromEntries(Object.entries(added).filter(([, r]) => r.animalId === animalId))
  return { saved: { ...current, ...mine }, ready: loaded?.animalId === animalId, record }
}
