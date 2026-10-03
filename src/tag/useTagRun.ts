// Runs motion windows through the real pipeline and keeps the tag's decision up to date.
// Two inputs: a replay scenario (recorded horse plus labelled synthetic parts) or the phone's own
// motion sensor standing in for the tag.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityModel,
  createPipeline,
  loadReplay,
  requestMotionPermission,
  startMotionRecorder,
  type MotionRecorder,
  type Pipeline,
  type PipelineCounters,
  type PipelineOutput,
  type Replay,
} from '../sensing'
import { getBudgets, getHerd } from '../simulation'
import { DEMO_NOW } from '../shared/lib/clock'
import type { Activity, Animal, Assessment, ImuWindow } from '../shared/types'
import { tagAssessment } from './engine'
import { buildScenario, SCENARIO_ANIMAL, type ScenarioId, type StreamWindow } from './scenarios'

/** Windows pushed per second during a replay: 10 windows of 2 s, so 20 times real time. */
export const REPLAY_RATE = 10
const RECENT = 36

export type RunStatus = 'loading' | 'ready' | 'running' | 'done' | 'error'
export type InputSource = 'replay' | 'phone'

export interface RecentWindow {
  activity: Activity
  source: StreamWindow['source'] | 'phone'
}

let assets: Promise<{ model: ActivityModel; replay: Replay }> | null = null
function loadAssets() {
  assets ??= Promise.all([ActivityModel.load(), loadReplay()]).then(([model, replay]) => ({ model, replay }))
  assets.catch(() => {
    assets = null
  })
  return assets
}

export function animalByName(name: string): Animal {
  const a = getHerd().find((x) => x.name === name)
  if (!a) throw new Error(`No animal called ${name} in the demo herd`)
  return a
}

export function useTagRun(source: InputSource, scenario: ScenarioId) {
  const [status, setStatus] = useState<RunStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<PipelineOutput | null>(null)
  const [lastSource, setLastSource] = useState<RecentWindow['source'] | null>(null)
  const [recent, setRecent] = useState<RecentWindow[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [phoneRate, setPhoneRate] = useState(0)

  const model = useRef<ActivityModel | null>(null)
  const replay = useRef<Replay | null>(null)
  const pipeline = useRef<Pipeline | null>(null)
  const stream = useRef<StreamWindow[]>([])
  const cursor = useRef(0)
  const timer = useRef<number | null>(null)
  const recorder = useRef<MotionRecorder | null>(null)
  const listeners = useRef(new Set<(w: ImuWindow) => void>())

  const animal = useMemo(() => animalByName(source === 'phone' ? SCENARIO_ANIMAL.normal : SCENARIO_ANIMAL[scenario]), [source, scenario])
  const budgets = useMemo(() => getBudgets(animal.id), [animal])
  const [counters, setCounters] = useState<PipelineCounters | null>(null)

  const assessment: Assessment = useMemo(() => {
    const empty = createPipelineCounters()
    return tagAssessment(animal, budgets, counters ?? empty, DEMO_NOW)
  }, [animal, budgets, counters])

  const stopTimers = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    recorder.current?.stop()
    recorder.current = null
  }, [])

  const resetRun = useCallback(() => {
    stopTimers()
    if (model.current) pipeline.current = createPipeline(model.current)
    cursor.current = 0
    setLast(null)
    setLastSource(null)
    setRecent([])
    setCounters(null)
    setProgress({ done: 0, total: stream.current.length })
    setStatus(model.current ? 'ready' : 'loading')
  }, [stopTimers])

  // Load the model and the recorded horse once.
  useEffect(() => {
    let alive = true
    loadAssets()
      .then(({ model: m, replay: r }) => {
        if (!alive) return
        model.current = m
        replay.current = r
        pipeline.current = createPipeline(m)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  // A new scenario or input starts from a clean tag.
  useEffect(() => {
    if (replay.current) stream.current = buildScenario(replay.current, scenario, DEMO_NOW)
    resetRun()
  }, [scenario, source, resetRun, status === 'loading'])

  useEffect(() => stopTimers, [stopTimers])

  const pushWindow = useCallback((w: ImuWindow, src: RecentWindow['source']) => {
    const p = pipeline.current
    if (!p) return null
    const out = p.push(w)
    for (const l of listeners.current) l(w)
    return { out, src }
  }, [])

  const commit = useCallback((outs: { out: PipelineOutput; src: RecentWindow['source'] }[]) => {
    if (outs.length === 0) return
    const final = outs[outs.length - 1]
    setLast(final.out)
    setLastSource(final.src)
    setCounters(final.out.counters)
    setRecent((r) => [...r, ...outs.map((o) => ({ activity: o.out.activity, source: o.src }))].slice(-RECENT))
  }, [])

  const step = useCallback(
    (n: number) => {
      const outs: { out: PipelineOutput; src: RecentWindow['source'] }[] = []
      while (n-- > 0 && cursor.current < stream.current.length) {
        const s = stream.current[cursor.current++]
        const r = pushWindow(s.window, s.source)
        if (r) outs.push(r)
      }
      commit(outs)
      setProgress({ done: cursor.current, total: stream.current.length })
      if (cursor.current >= stream.current.length) {
        stopTimers()
        setStatus('done')
      }
    },
    [commit, pushWindow, stopTimers],
  )

  const play = useCallback(() => {
    if (!pipeline.current || source !== 'replay') return
    if (cursor.current >= stream.current.length) resetRun()
    stopTimers()
    setStatus('running')
    timer.current = window.setInterval(() => step(1), 1000 / REPLAY_RATE)
  }, [resetRun, source, step, stopTimers])

  const pause = useCallback(() => {
    stopTimers()
    setStatus(cursor.current >= stream.current.length ? 'done' : 'ready')
  }, [stopTimers])

  const runToEnd = useCallback(() => {
    stopTimers()
    step(stream.current.length)
  }, [step, stopTimers])

  const startPhone = useCallback(async () => {
    const permission = await requestMotionPermission()
    if (permission !== 'granted') {
      setError(permission === 'unsupported' ? 'tag.phone.unsupported' : 'tag.phone.denied')
      return false
    }
    setError(null)
    stopTimers()
    if (model.current) pipeline.current = createPipeline(model.current)
    setStatus('running')
    const rec = startMotionRecorder({
      onWindow: (w) => {
        const r = pushWindow(w, 'phone')
        if (r) commit([r])
        setPhoneRate(Math.round(rec.rateHz()))
      },
    })
    recorder.current = rec
    return true
  }, [commit, pushWindow, stopTimers])

  /** Subscribe to every window that goes into the pipeline (the recorder uses this). */
  const onWindow = useCallback((fn: (w: ImuWindow) => void) => {
    listeners.current.add(fn)
    return () => {
      listeners.current.delete(fn)
    }
  }, [])

  return {
    status,
    error,
    animal,
    assessment,
    last,
    lastSource,
    recent,
    counters,
    progress,
    phoneRate,
    play,
    pause,
    runToEnd,
    reset: resetRun,
    startPhone,
    stop: pause,
    onWindow,
  }
}

function createPipelineCounters(): PipelineCounters {
  return {
    windowsProcessed: 0,
    notSure: 0,
    minutes: { stand: 0, walk: 0, trot: 0, eat: 0, roll: 0, lie: 0, unknown: 0 },
    lyingBouts: 0,
    upDowns: 0,
    rollingBouts: 0,
    falls: 0,
  }
}
