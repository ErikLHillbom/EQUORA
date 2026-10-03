/// <reference types="node" />
// The chain end to end (SPEC 11): real collar windows in, features, classifier, rules,
// the animal's own baseline, one of five states out.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ActivityModel, createPipeline, loadReplay, type ForestJson, type Replay } from '../sensing'
import { getBudgets, getHerd } from '../simulation'
import { DEMO_NOW } from '../shared/lib/clock'
import type { StateId } from '../shared/types'
import { tagAssessment } from './engine'
import { buildScenario, SCENARIO_ANIMAL, type ScenarioId } from './scenarios'

const root = join(__dirname, '..', '..', 'public')
const fsFetch = (async (url: string) => new Response(readFileSync(join(root, url.replace(/^\//, ''))))) as unknown as typeof fetch

let replay: Replay
let model: ActivityModel

beforeAll(async () => {
  replay = await loadReplay('/replay/', fsFetch)
  model = new ActivityModel(JSON.parse(readFileSync(join(root, 'models', 'activity-v1.json'), 'utf8')) as ForestJson)
})

function runScenario(id: ScenarioId) {
  const animal = getHerd().find((a) => a.name === SCENARIO_ANIMAL[id])!
  const pipe = createPipeline(model)
  for (const s of buildScenario(replay, id, DEMO_NOW)) pipe.push(s.window)
  return tagAssessment(animal, getBudgets(animal.id), pipe.counters(), DEMO_NOW)
}

const EXPECTED: Record<ScenarioId, StateId> = {
  normal: 'normal',
  water: 'water',
  dull: 'check',
  colic: 'urgent',
  fall: 'urgent',
}

describe('the tag decides one of five states from real motion windows', () => {
  for (const [id, state] of Object.entries(EXPECTED) as [ScenarioId, StateId][]) {
    it(`${id} on ${SCENARIO_ANIMAL[id]} gives ${state}`, () => {
      const a = runScenario(id)
      expect(a.state, JSON.stringify(a.reasons.map((r) => r.textKey))).toBe(state)
    })
  }

  it('the colic stream turns a normal horse urgent', () => {
    const saba = getHerd().find((a) => a.name === 'Saba')!
    const before = tagAssessment(saba, getBudgets(saba.id), createPipeline(model).counters(), DEMO_NOW)
    expect(before.state).toBe('normal')
    expect(runScenario('colic').reasons.map((r) => r.kind)).toEqual(expect.arrayContaining(['upDowns']))
  })
})
