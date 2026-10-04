// Hidden specimen sheet at /specimen: every primitive in every variant and state (DESIGN 11).
// Not in the nav. Screenshot at 360 px and in greyscale before building screens.
import { useState, type ReactNode } from 'react'
import { DAY, DEMO_NOW, HOUR } from '../shared/lib/clock'
import { createRng } from '../shared/lib/random'
import { BandChart, Sparkline, type BandPoint } from '../shared/charts'
import {
  Button,
  CaseFolder,
  CircledNumeral,
  CoordinateBlock,
  DateStamp,
  DotBar,
  DotNumber,
  EmptyNote,
  HeaderStrip,
  Ledger,
  Lens,
  Logbook,
  LogbookEntry,
  MonoLabel,
  NumberedHeading,
  Paper,
  PencilCircle,
  PencilUnderline,
  Perforation,
  PostureDrawing,
  RectStamp,
  RoundButton,
  Slip,
  StateStamp,
  StitchDivider,
  Tabs,
  Tape,
  TodayCard,
} from '../shared/ui'
import { STATES, type ForecastPoint, type Pose } from '../shared/types'
import './specimen.css'

const POSES: Pose[] = ['standing', 'walking', 'trotting', 'grazing', 'lying']

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="spec-section" aria-labelledby={`spec-${n}`}>
      <NumberedHeading n={n} id={`spec-${n}`}>
        {title}
      </NumberedHeading>
      {children}
    </section>
  )
}

/** Hourly activity for today with an excursion below the band in the afternoon. */
function todaySeries(): BandPoint[] {
  const rng = createRng('specimen:today')
  const start = DEMO_NOW - 14 * HOUR
  return Array.from({ length: 15 }, (_, i) => {
    const h = (i + 0) % 24
    const base = 30 + 18 * Math.sin((h / 14) * Math.PI)
    const low = base - 9
    const high = base + 9
    let value = base + (rng() - 0.5) * 8
    if (i >= 11) value = low - 6 - (i - 11) * 3
    return { t: start + i * HOUR, value: Math.round(value * 10) / 10, low, high }
  })
}

/** Seven days of daily distance inside the band, then a forecast. */
function weekSeries(): { data: BandPoint[]; forecast: ForecastPoint[] } {
  const rng = createRng('specimen:week')
  const start = DEMO_NOW - 6 * DAY
  const data = Array.from({ length: 7 }, (_, i) => ({
    t: start + i * DAY,
    value: Math.round((7 + (rng() - 0.5) * 1.6) * 10) / 10,
    low: 6,
    high: 8,
  }))
  const last = data[data.length - 1]
  const forecast = Array.from({ length: 4 }, (_, i) => {
    const p50 = 7 - i * 0.3
    return { t: last.t + i * DAY, p10: p50 - 0.6 - i * 0.4, p50, p90: p50 + 0.6 + i * 0.4 }
  })
  return { data, forecast }
}

const TODAY = todaySeries()
const WEEK = weekSeries()

export default function SpecimenScreen() {
  const [range, setRange] = useState('7d')
  const [pressed, setPressed] = useState(false)
  const rangeItems = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '6m', label: '6 months' },
  ]

  return (
    <Paper nav={false} className="spec">
      <HeaderStrip
        title="Equora"
        kicker="Specimen sheet"
        aside={<RectStamp kind="simulated" id="spec-sim" />}
        id="specimen"
      >
        <CoordinateBlock
          label="Demo area"
          cells={['6.162 N', '38.205 E', 'Yirgacheffe', 'Gedeo zone', 'Elev 1,880 m', 'Sat 14:20 EAT']}
        />
      </HeaderStrip>

      <Section n={1} title="State stamps">
        <Slip>
          <MonoLabel as="h3">Inline</MonoLabel>
          <ul className="spec-row spec-list">
            {STATES.map((s) => (
              <li key={s}>
                <StateStamp state={s} id="mulu" />
              </li>
            ))}
          </ul>
          <StitchDivider />
          <MonoLabel as="h3">Large</MonoLabel>
          <ul className="spec-grid spec-list">
            {STATES.map((s) => (
              <li key={s}>
                <StateStamp state={s} size="large" id="mulu" />
              </li>
            ))}
          </ul>
          <StitchDivider />
          <MonoLabel as="h3">Herd count row</MonoLabel>
          <ul className="spec-counts spec-list">
            {STATES.map((s, i) => (
              <li key={s}>
                <StateStamp state={s} id={`count-${s}`} />
                <span className="mono spec-count">{[7, 1, 2, 1, 1][i]}</span>
              </li>
            ))}
          </ul>
        </Slip>
      </Section>

      <Section n={2} title="Other stamps">
        <Slip className="spec-stack">
          <div className="spec-row">
            <RectStamp kind="simulated" id="a" />
            <RectStamp kind="experimental" id="b" />
          </div>
          <RectStamp kind="learning" name="Mulu" day={2} of={5} id="c" />
          <div className="spec-row">
            <DateStamp at={DEMO_NOW} id="d1" />
            <DateStamp at={DEMO_NOW - DAY} withTime={false} id="d2" />
          </div>
          <div className="spec-row">
            <RectStamp kind="feedback" feedback="fine" id="f1" />
            <RectStamp kind="feedback" feedback="not_eating" id="f2" />
          </div>
          <div className="spec-row">
            <RectStamp kind="feedback" feedback="called_help" id="f3" />
            <RectStamp kind="feedback" feedback="treated" id="f4" />
          </div>
        </Slip>
      </Section>

      <Section n={3} title="Today cards">
        <div className="spec-cards">
          <TodayCard label="Distance" value={7.4} unit="km" name="Mulu" low={6} high={8} dotMatrix id="t1" />
          <TodayCard label="Distance" value={2.1} unit="km" name="Mulu" low={6} high={8} state="check" dotMatrix id="t2" />
          <TodayCard label="Eating" value={5.6} unit="h" name="Mulu" low={6.5} high={9} state="urgent" id="t3" />
          <TodayCard label="Lying" value={1.2} unit="h" name="Mulu" low={0.5} high={2} experimental id="t4" />
          <TodayCard label="Climb" value={140} unit="m" name="Mulu" decimals={0} id="t5" />
          <TodayCard label="Workload" value={null} unit="h" name="Mulu" low={3} high={6} id="t6" />
        </div>
        <Slip className="spec-stack">
          <MonoLabel as="h3">Dot bar and dot number</MonoLabel>
          <DotBar value={7} low={6} high={8} />
          <DotBar value={9.6} low={6} high={8} state="water" />
          <DotBar value={2.1} low={6} high={8} state="urgent" />
          <div className="spec-row">
            <DotNumber value="12.5" />
            <DotNumber value="-3%" height={40} />
            <DotNumber value="14:20" height={40} />
          </div>
        </Slip>
      </Section>

      <Section n={4} title="Buttons and tabs">
        <Slip className="spec-stack">
          <Button variant="primary" block>
            Record a check
          </Button>
          <div className="spec-row">
            <Button>Checked: fine</Button>
            <Button aria-pressed={pressed} onClick={() => setPressed((p) => !p)}>
              Not eating
            </Button>
          </div>
          <div className="spec-row">
            <Button className="is-pressed">Pressed</Button>
            <Button className="spec-focus">Focus ring</Button>
            <Button disabled>Disabled</Button>
          </div>
          <Button variant="tertiary">Show all changes</Button>
          <div className="spec-row spec-center">
            <RoundButton label="Play" icon="play" />
            <RoundButton label="Pause" icon="pause" size={56} />
            <RoundButton label="Stop" icon="stop" size={56} className="is-pressed" />
          </div>
          <Tabs label="Time range" items={rangeItems} value={range} onChange={setRange} idPrefix="spec-range" />
        </Slip>
      </Section>

      <Section n={5} title="Logbook">
        <Slip>
          <Logbook label="Detected changes">
            <LogbookEntry
              at={DEMO_NOW - 2 * HOUR}
              state="check"
              id="ch1"
              actions={
                <>
                  <Button>Checked: fine</Button>
                  <Button>Not eating</Button>
                  <Button>Called for help</Button>
                  <Button>Treated</Button>
                </>
              }
            >
              Mulu walked 64% less than her normal since 11:00.
            </LogbookEntry>
            <LogbookEntry at={DEMO_NOW - DAY - 5 * HOUR} state="water" id="ch2" feedback="fine">
              Mulu worked 4 hours in 31 °C without a water stop.
            </LogbookEntry>
            <LogbookEntry at={DEMO_NOW - 3 * DAY} state="urgent" id="ch3" feedback="called_help">
              Abeba lay down and got up 5 times in 30 minutes.
            </LogbookEntry>
          </Logbook>
          <Perforation />
          <p className="spec-note">Perforation on its own, between two blocks.</p>
        </Slip>
      </Section>

      <Section n={6} title="Pencil, tape and folder">
        <PencilCircle state="urgent" id="abeba">
          <Slip className="spec-animal">
            <PostureDrawing species="horse" pose="lying" width={96} decorative />
            <div>
              <p className="spec-name">Abeba</p>
              <p className="ui-label">Horse</p>
              <StateStamp state="urgent" id="abeba" />
            </div>
          </Slip>
        </PencilCircle>
        <p className="spec-inline-num">
          Eating today:{' '}
          <PencilUnderline state="check" id="under-1">
            <span className="mono spec-big">4.1 h</span>
          </PencilUnderline>
        </p>
        <Slip className="spec-taped">
          <Tape />
          <PostureDrawing species="donkey" pose="standing" width={200} />
        </Slip>
        <CaseFolder label="Mulu" note="Tag 0412">
          <NumberedHeading n={1} as="h3">
            Today
          </NumberedHeading>
          <NumberedHeading n={2} as="h3">
            Trends
          </NumberedHeading>
          <NumberedHeading n={3} as="h3">
            Detected changes
          </NumberedHeading>
          <div className="spec-row">
            <CircledNumeral n={4} />
            <CircledNumeral n={12} />
          </div>
        </CaseFolder>
      </Section>

      <Section n={7} title="Charts">
        <Slip className="spec-stack">
          <MonoLabel as="h3">Activity today, excursion below</MonoLabel>
          <BandChart
            data={TODAY}
            state="check"
            title="Activity today"
            desc="Activity stayed inside Mulu's normal until 11:00, then dropped below it."
            unit="min/h"
          />
        </Slip>
        <Slip className="spec-stack">
          <MonoLabel as="h3">Distance, 7 days and forecast</MonoLabel>
          <Tabs label="Time range" items={rangeItems} value={range} onChange={setRange} idPrefix="spec-range2" />
          <BandChart
            data={WEEK.data}
            forecast={WEEK.forecast}
            title="Distance, last 7 days and next 3 days"
            unit="km"
            height={180}
          />
          <div className="spec-row">
            <Sparkline values={[7, 7.2, 6.8, 7.1, 6.9, 5.1, 4.2]} low={6} high={8} state="check" label="Distance, 7 days, below normal on the last 2 days" />
            <Sparkline values={[7, 7.2, 6.8, 7.1, 6.9, 7.3, 7]} low={6} high={8} label="Distance, 7 days, inside normal" />
          </div>
        </Slip>
      </Section>

      <Section n={8} title="Posture drawings">
        <Slip>
          <MonoLabel as="h3">Horse</MonoLabel>
          <ul className="spec-postures spec-list">
            {POSES.map((p) => (
              <li key={p}>
                <PostureDrawing species="horse" pose={p} width={150} />
                <span className="ui-label">{p}</span>
              </li>
            ))}
          </ul>
          <StitchDivider />
          <MonoLabel as="h3">Donkey (mule uses this set)</MonoLabel>
          <ul className="spec-postures spec-list">
            {POSES.map((p) => (
              <li key={p}>
                <PostureDrawing species="donkey" pose={p} width={150} />
                <span className="ui-label">{p}</span>
              </li>
            ))}
          </ul>
          <StitchDivider />
          <MonoLabel as="h3">Stale data</MonoLabel>
          <ul className="spec-postures spec-list">
            <li>
              <PostureDrawing species="horse" pose="standing" stale width={150} />
              <span className="ui-label">Horse, stale</span>
            </li>
            <li>
              <PostureDrawing species="donkey" pose="grazing" stale width={150} />
              <span className="ui-label">Donkey, stale</span>
            </li>
          </ul>
        </Slip>
      </Section>

      <Section n={9} title="Tag light">
        <Slip className="spec-lenses">
          {STATES.map((s) => (
            <Lens key={s} state={s} size={96} />
          ))}
          <Lens state="normal" size={96} off showWord={false} />
        </Slip>
      </Section>

      <Section n={10} title="Notes and ledger">
        <EmptyNote
          title="No map tiles"
          drawing={<PostureDrawing species="donkey" pose="grazing" width={72} decorative />}
        >
          Map tiles for this area are not saved on this phone.
        </EmptyNote>
        <EmptyNote>No changes detected in the last 7 days.</EmptyNote>
        <Slip>
          <Ledger caption="Herd, Saturday 14:20">
            <thead>
              <tr>
                <th scope="col">Animal</th>
                <th scope="col">State</th>
                <th scope="col" className="num">
                  km
                </th>
                <th scope="col" className="num">
                  Eat h
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Abeba', 'urgent', '0.4', '1.2'],
                ['Mulu', 'check', '2.1', '5.6'],
                ['Tesfa', 'water', '9.8', '6.9'],
                ['Kebede', 'not_sure', '-', '-'],
                ['Almaz', 'normal', '7.2', '7.8'],
              ].map(([name, st, km, eat]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>
                    <StateStamp state={st as (typeof STATES)[number]} id={name} />
                  </td>
                  <td className="num">{km}</td>
                  <td className="num">{eat}</td>
                </tr>
              ))}
            </tbody>
          </Ledger>
        </Slip>
      </Section>

      <Section n={11} title="Kraft slip">
        <Slip tone="kraft" className="spec-kraft">
          <Tape placement="top-left" angle={-4} />
          <p className="spec-kraft-title">What our data does not cover</p>
          <p>No sensor data from any animal with colic.</p>
        </Slip>
      </Section>
    </Paper>
  )
}
