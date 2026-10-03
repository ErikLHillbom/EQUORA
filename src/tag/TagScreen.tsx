// The Tag screen is the physical tag (DESIGN 9): a light, one phrase, a play button, and below it
// the pipeline that produced them. The input is a replay of real collar data or the phone itself.
import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/LanguageContext'
import { createRecordingStore, type RecordingStore } from '../sensing'
import { formatTime, MINUTE } from '../shared/lib/clock'
import type { Activity, ImuWindow, Pose, StateId } from '../shared/types'
import {
  Button,
  HeaderStrip,
  Lens,
  MonoLabel,
  NumberedHeading,
  Paper,
  PostureDrawing,
  RectStamp,
  RoundButton,
  Slip,
  StitchDivider,
  Tabs,
} from '../shared/ui'
import { isMachineVoice, MACHINE_VOICE_KEY, phraseFor } from './phrases'
import { SCENARIO_ANIMAL, SCENARIO_SIMULATED, SCENARIOS, type ScenarioId } from './scenarios'
import { REPLAY_RATE, useTagRun, type InputSource, type RecentWindow } from './useTagRun'
import { playPhrase, stopVoice } from './voice'
import './tag.css'

const POSE: Record<Activity, Pose> = {
  stand: 'standing',
  walk: 'walking',
  trot: 'trotting',
  eat: 'grazing',
  lie: 'lying',
  roll: 'lying',
  unknown: 'standing',
}

const RECORD_LABELS: readonly Activity[] = ['stand', 'walk', 'eat', 'lie', 'roll']

export default function TagScreen() {
  const { t, lang } = useT()
  const [source, setSource] = useState<InputSource>('replay')
  const [scenario, setScenario] = useState<ScenarioId>('colic')
  const run = useTagRun(source, scenario)
  const { assessment, animal, last, counters } = run
  const state = assessment.state
  const phrase = phraseFor(state)
  const phraseText = phrase.textKey ? t(phrase.textKey) : t('tag.phrase.normal')

  // The tag speaks when its state changes while running, as the real tag would.
  const [voiceOn, setVoiceOn] = useState(true)
  const spoken = useRef<StateId>(state)
  useEffect(() => {
    if (run.status !== 'running' && run.status !== 'done') {
      spoken.current = state
      return
    }
    if (state === spoken.current) return
    spoken.current = state
    if (voiceOn && phrase.textKey) void playPhrase(state, lang, phraseText)
  }, [state, run.status, voiceOn, phrase.textKey, lang, phraseText])
  useEffect(() => stopVoice, [])

  const simulated = source === 'replay' ? SCENARIO_SIMULATED[scenario] : false
  const animalMinutes = counters ? (counters.windowsProcessed * 2) / 60 : 0

  return (
    <Paper>
      <HeaderStrip
        title={t('tag.title')}
        kicker={`${animal.tagId} · ${t(`shared.species.${animal.species}`)} · ${animal.name}`}
        id="tag-header"
        aside={<RectStamp kind="simulated" id="tag-sim" />}
      />

      <section className="tag-device" aria-labelledby="tag-device-h">
        <h2 id="tag-device-h" className="visually-hidden">
          {t('tag.device')}
        </h2>
        <Slip className="tag-device__body">
          <div className="tag-device__light">
            <Lens state={state} size={148} />
          </div>
          <p className="tag-device__phrase" lang={lang === 'am' ? 'am' : 'en'}>
            {phraseText}
          </p>
          <div className="tag-device__play">
            <RoundButton
              label={t('tag.play')}
              icon="play"
              disabled={!phrase.textKey}
              onClick={() => void playPhrase(state, lang, phraseText)}
            />
            <label className="tag-device__voice">
              <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
              {t('tag.voiceOn')}
            </label>
          </div>
          {phrase.textKey && isMachineVoice(state, lang) && <p className="tag-note">{t(MACHINE_VOICE_KEY)}</p>}
          {assessment.reasons.length > 0 && (
            <ul className="tag-reasons">
              {assessment.reasons.slice(0, 3).map((r, i) => (
                <li key={i}>{t(r.textKey, r.params)}</li>
              ))}
            </ul>
          )}
          {assessment.learning && (
            <RectStamp kind="learning" name={animal.name} day={assessment.learning.day} of={assessment.learning.of} id="tag-learn" />
          )}
        </Slip>
      </section>

      <StitchDivider />

      <section aria-labelledby="tag-input-h">
        <NumberedHeading n={1} id="tag-input-h">
          {t('tag.input')}
        </NumberedHeading>
        <Tabs
          label={t('tag.input')}
          items={[
            { id: 'replay', label: t('tag.source.replay') },
            { id: 'phone', label: t('tag.source.phone') },
          ]}
          value={source}
          onChange={(id) => setSource(id as InputSource)}
          idPrefix="tag-src"
          controls="tag-src-panel"
        />
        <div id="tag-src-panel" role="tabpanel" aria-labelledby={`tag-src-${source}`} className="tag-panel">
          {source === 'replay' ? (
            <ReplayPanel scenario={scenario} onScenario={setScenario} run={run} simulated={simulated} />
          ) : (
            <PhonePanel run={run} />
          )}
        </div>
      </section>

      <StitchDivider />

      <section aria-labelledby="tag-pipe-h">
        <NumberedHeading n={2} id="tag-pipe-h">
          {t('tag.pipeline')}
        </NumberedHeading>
        <Slip>
          <div className="tag-pipe">
            <PostureDrawing
              species={animal.species}
              pose={last ? POSE[last.activity] : assessment.pose}
              stale={!last || last.activity === 'unknown'}
              width={180}
            />
            <dl className="tag-readout">
              <Row k={t('tag.readout.activity')} v={last ? t(`sensing.activity.${last.activity}`) : '-'} />
              <Row
                k={t('tag.readout.confidence')}
                v={last ? `${Math.round(Math.max(...Object.values(last.classification.probs)) * 100)}%` : '-'}
              />
              <Row k={t('tag.readout.posture')} v={last ? t(`tag.posture.${last.posture}`) : '-'} experimental />
              <Row k={t('tag.readout.source')} v={run.lastSource ? t(`tag.from.${run.lastSource}`) : '-'} />
              <Row k={t('tag.readout.windows')} v={String(counters?.windowsProcessed ?? 0)} />
              <Row k={t('tag.readout.notSure')} v={String(counters?.notSure ?? 0)} />
              <Row k={t('tag.readout.lyingBouts')} v={String(counters?.lyingBouts ?? 0)} experimental />
              <Row k={t('tag.readout.upDowns')} v={String(counters?.upDowns ?? 0)} experimental />
              <Row k={t('tag.readout.rolling')} v={String(counters?.rollingBouts ?? 0)} experimental />
              <Row k={t('tag.readout.falls')} v={String(counters?.falls ?? 0)} experimental />
              <Row k={t('tag.readout.animalTime')} v={`${animalMinutes.toFixed(1)} min`} />
              <Row k={t('tag.readout.lastUpdate')} v={last ? formatTime(last.at) : '-'} />
            </dl>
          </div>
          <ActivityTape recent={run.recent} />
          <p className="tag-note">{t('tag.pipeline.note')}</p>
        </Slip>
      </section>
    </Paper>
  )
}

function Row({ k, v, experimental }: { k: string; v: string; experimental?: boolean }) {
  const { t } = useT()
  return (
    <div className="tag-readout__row">
      <dt>{k}</dt>
      <dd>
        {v}
        {experimental && <span className="tag-exp">{t('shared.stamp.experimental')}</span>}
      </dd>
    </div>
  )
}

const TAPE_LETTER: Record<Activity, string> = { stand: 'S', walk: 'W', trot: 'T', eat: 'E', lie: 'L', roll: 'R', unknown: '?' }

function ActivityTape({ recent }: { recent: RecentWindow[] }) {
  const { t } = useT()
  if (recent.length === 0) return null
  return (
    <div className="tag-tape" aria-label={t('tag.tape.label')}>
      <MonoLabel>{t('tag.tape.label')}</MonoLabel>
      <ol className="tag-tape__cells">
        {recent.map((r, i) => (
          <li
            key={i}
            className={`tag-tape__cell${r.source === 'synthetic' ? ' tag-tape__cell--synthetic' : ''}`}
            title={t(`sensing.activity.${r.activity}`)}
          >
            {TAPE_LETTER[r.activity]}
          </li>
        ))}
      </ol>
      <p className="tag-tape__key">{t('tag.tape.key')}</p>
    </div>
  )
}

type Run = ReturnType<typeof useTagRun>

function ReplayPanel({
  scenario,
  onScenario,
  run,
  simulated,
}: {
  scenario: ScenarioId
  onScenario: (s: ScenarioId) => void
  run: Run
  simulated: boolean
}) {
  const { t } = useT()
  const running = run.status === 'running'
  const pct = run.progress.total ? Math.round((100 * run.progress.done) / run.progress.total) : 0
  return (
    <>
      <ul className="tag-scenarios" aria-label={t('tag.scenarios')}>
        {SCENARIOS.map((id) => (
          <li key={id}>
            <Button
              variant="secondary"
              block
              aria-pressed={scenario === id}
              className={scenario === id ? 'is-pressed' : undefined}
              onClick={() => onScenario(id)}
            >
              <span className="tag-scenario__name">{t(`tag.scenario.${id}`)}</span>
              <span className="tag-scenario__meta">
                {SCENARIO_ANIMAL[id]} · {t(SCENARIO_SIMULATED[id] ? 'tag.scenario.partSynthetic' : 'tag.scenario.recorded')}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      <p className="tag-note">{t(`tag.scenario.${scenario}.about`)}</p>
      {simulated && <RectStamp kind="custom" text={t('tag.scenario.synthStamp')} tone="graphite" id={`tag-syn-${scenario}`} />}
      <div className="tag-controls">
        {running ? (
          <Button variant="primary" onClick={run.pause}>
            {t('tag.pause')}
          </Button>
        ) : (
          <Button variant="primary" onClick={run.play} disabled={run.status === 'loading' || run.status === 'error'}>
            {run.status === 'done' ? t('tag.replayAgain') : t('tag.start')}
          </Button>
        )}
        <Button variant="secondary" onClick={run.runToEnd} disabled={run.status === 'loading' || run.status === 'done'}>
          {t('tag.runToEnd')}
        </Button>
        <Button variant="tertiary" onClick={run.reset}>
          {t('tag.reset')}
        </Button>
      </div>
      <p className="tag-progress mono">
        {t('tag.progress', { done: run.progress.done, total: run.progress.total, pct, speed: REPLAY_RATE * 2 })}
      </p>
      {run.status === 'error' && <p className="tag-note">{t('tag.loadError')}</p>}
    </>
  )
}

function PhonePanel({ run }: { run: Run }) {
  const { t } = useT()
  const [label, setLabel] = useState<Activity | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [pending, setPending] = useState(0)
  const store = useRef<RecordingStore | null>(null)
  const buffer = useRef<ImuWindow[]>([])
  const running = run.status === 'running'

  useEffect(() => {
    store.current = createRecordingStore()
    void store.current.pending().then((p) => setPending(p.length))
    return () => store.current?.close()
  }, [])

  useEffect(() => {
    if (!label) return
    buffer.current = []
    return run.onWindow((w) => buffer.current.push(w))
  }, [label, run])

  const stopRecording = async () => {
    const windows = buffer.current
    const l = label
    setLabel(null)
    if (!l || windows.length === 0 || !store.current) return
    await store.current.save({ label: l, windows, animalId: run.animal.id })
    setSaved(Math.round((windows.length * 2 * 1000) / MINUTE * 10) / 10)
    setPending((await store.current.pending()).length)
  }

  return (
    <>
      <p className="tag-note">{t('tag.phone.about')}</p>
      <div className="tag-controls">
        {running ? (
          <Button variant="primary" onClick={run.stop}>
            {t('tag.phone.stop')}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void run.startPhone()}>
            {t('tag.phone.start')}
          </Button>
        )}
      </div>
      {running && <p className="tag-progress mono">{t('tag.phone.rate', { hz: run.phoneRate })}</p>}
      {run.error && <p className="tag-note">{t(run.error)}</p>}

      <MonoLabel as="h3">{t('tag.record.title')}</MonoLabel>
      <p className="tag-note">{t('tag.record.about')}</p>
      <div className="tag-tiles" role="group" aria-label={t('tag.record.title')}>
        {RECORD_LABELS.map((l) => {
          const on = label === l
          return (
            <button
              key={l}
              type="button"
              className={`tag-tile${on ? ' tag-tile--on' : ''}`}
              aria-pressed={on}
              disabled={!running || (label !== null && !on)}
              onClick={() => (on ? void stopRecording() : setLabel(l))}
            >
              <span className="tag-tile__mark" aria-hidden="true">
                {on ? '■' : '□'}
              </span>
              <span className="tag-tile__label">{t(`sensing.activity.${l}`)}</span>
              <span className="tag-tile__state">{on ? t('tag.record.recording') : t('tag.record.tap')}</span>
            </button>
          )
        })}
      </div>
      {saved !== null && <p className="tag-note">{t('tag.record.saved', { min: saved })}</p>}
      <p className="tag-note mono">{t('tag.record.pending', { n: pending })}</p>
    </>
  )
}
