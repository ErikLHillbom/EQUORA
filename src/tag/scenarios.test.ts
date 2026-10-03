/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ActivityModel, createPipeline, loadReplay, type ForestJson, type Replay } from '../sensing'
import { buildScenario, SCENARIOS, type ScenarioId } from './scenarios'

const root = join(__dirname, '..', '..', 'public')

const fsFetch = (async (url: string) => {
  const buf = readFileSync(join(root, url.replace(/^\//, '')))
  return new Response(buf)
}) as unknown as typeof fetch

let replay: Replay
let model: ActivityModel

beforeAll(async () => {
  replay = await loadReplay('/replay/', fsFetch)
  model = new ActivityModel(JSON.parse(readFileSync(join(root, 'models', 'activity-v1.json'), 'utf8')) as ForestJson)
})

function run(id: ScenarioId) {
  const pipe = createPipeline(model)
  const stream = buildScenario(replay, id, 0)
  let correct = 0
  let recorded = 0
  for (const s of stream) {
    const out = pipe.push(s.window)
    if (s.truth) {
      recorded++
      if (out.classification.label === s.truth) correct++
    }
  }
  return { counters: pipe.counters(), accuracy: recorded ? correct / recorded : 1 }
}

describe('tag scenarios through the real pipeline', () => {
  it('builds every scenario', () => {
    for (const id of SCENARIOS) expect(buildScenario(replay, id, 0).length).toBeGreaterThan(50)
  })

  it('a normal morning raises no events and classifies the recorded windows well', () => {
    const { counters, accuracy } = run('normal')
    expect(counters.upDowns + counters.rollingBouts + counters.falls).toBe(0)
    expect(accuracy).toBeGreaterThan(0.8)
  })

  it('the colic stream shows repeated getting up and rolling', () => {
    const { counters } = run('colic')
    expect(counters.upDowns).toBeGreaterThanOrEqual(3)
    expect(counters.rollingBouts).toBeGreaterThanOrEqual(2)
  })

  it('the fall stream shows one fall', () => {
    expect(run('fall').counters.falls).toBe(1)
  })

  it('the dull stream shows a long lying bout', () => {
    const { counters } = run('dull')
    expect(counters.lyingBouts).toBeGreaterThanOrEqual(1)
    expect(counters.minutes.lie).toBeGreaterThan(1)
  })
})
