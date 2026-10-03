import type { Animal } from '../shared/types'
import { DAY, DEMO_NOW, HOUR, localDayStart } from '../shared/lib/clock'
import { hasKey } from '../i18n'
import { makeHour, synthHistory } from '../baseline/fixtures'
import { getBudgets, getDetectedChanges, getHerd, herdMember } from '../simulation'
import { assess, assessHerd, detectChanges, logbook, mergeFeedback } from '.'

const NOW = DEMO_NOW
const today = localDayStart(NOW)

function animal(species: Animal['species'], o: Partial<Animal> = {}): Animal {
  return {
    id: 'test',
    name: 'Test',
    species,
    sex: 'female',
    ageYears: 6,
    bodyWeightKg: species === 'horse' ? 300 : 150,
    tagId: 'ES-9999',
    household: 'domorso',
    work: 'pack',
    tagSince: NOW - 60 * DAY,
    ...o,
  }
}

const isToday = (t: number) => t >= today

describe('the demo herd today', () => {
  const states = Object.fromEntries(assessHerd().map((a) => [herdMember(a.animalId).animal.name, a]))

  it('reaches each of the five states as the team notes say', () => {
    expect(states.Mulu.state).toBe('normal')
    expect(states.Bari.state).toBe('check')
    expect(states.Kito.state).toBe('urgent')
    expect(states.Saba.state).toBe('normal')
    expect(states.Chaltu.state).toBe('water')
    expect(states.Gelila.state).toBe('not_sure')
  })

  it('keeps the other six animals normal', () => {
    for (const name of ['Almaz', 'Gutu', 'Boru', 'Desta', 'Hawi', 'Lemma']) expect(states[name].state).toBe('normal')
  })

  it('gives Bari a dullness reason with activity about 31% below normal', () => {
    const r = states.Bari.reasons[0]
    expect(r.textKey).toBe('alerts.reason.activityDown')
    expect(r.params.pct).toBeGreaterThanOrEqual(25)
    expect(r.params.pct).toBeLessThanOrEqual(40)
    expect(states.Bari.reasons.some((x) => x.kind === 'lying')).toBe(true)
  })

  it('says Kito possibly fell at 14:14 and is lying', () => {
    const r = states.Kito.reasons[0]
    expect(r.kind).toBe('fall')
    expect(r.params.time).toBe('14:14')
    expect(r.params.minutes).toBe(6)
    expect(states.Kito.pose).toBe('lying')
  })

  it('gives Chaltu a water deficit between 3 and 5% and over 4 hours of work without water', () => {
    const debt = states.Chaltu.reasons.find((r) => r.kind === 'waterDebt')!
    expect(debt.params.pct).toBeGreaterThanOrEqual(3)
    expect(debt.params.pct).toBeLessThan(5)
    expect(states.Chaltu.reasons.some((r) => r.kind === 'noRest')).toBe(true)
    expect(states.Chaltu.pose).toBe('walking')
  })

  it('shows Gelila learning, day 2 of 5', () => {
    expect(states.Gelila.learning).toEqual({ day: 2, of: 5 })
    expect(states.Gelila.reasons[0].kind).toBe('shortBaseline')
  })

  it('sorts the most urgent first', () => {
    const order = assessHerd().map((a) => a.state)
    expect(order[0]).toBe('urgent')
    expect(order[1]).toBe('check')
    expect(order[2]).toBe('water')
    expect(order[3]).toBe('not_sure')
  })

  it('uses only string keys that exist', () => {
    for (const a of assessHerd()) for (const r of a.reasons) expect(hasKey(r.textKey)).toBe(true)
  })
})

describe('rules on hand-made data', () => {
  const donkey = animal('donkey')
  const horse = animal('horse')

  it('does not alarm for one lying bout after loading', () => {
    const b = synthHistory(NOW, 20, (t, h, base) => {
      if (!isToday(t)) return base
      if (h >= 9 && h <= 11) return makeHour(t, { minutes: { walk: 50, stand: 10 }, workMin: 58, climbM: 60, distanceKm: 3 })
      if (h === 12) return makeHour(t, { minutes: { lie: 30, eat: 15, walk: 2 }, lyingBouts: 1, upDowns: 1, waterStopMin: 8 })
      return base
    })
    const a = assess(donkey, b, NOW)
    expect(a.state).toBe('normal')
  })

  it('makes repeated getting up and down within 30 minutes URGENT for a horse', () => {
    const b = synthHistory(NOW, 20, (t, h, base) =>
      isToday(t) && h === 13 ? makeHour(t, { minutes: { lie: 20, eat: 5, walk: 10 }, lyingBouts: 3, upDowns: 3 }) : base,
    )
    const a = assess(horse, b, NOW)
    expect(a.state).toBe('urgent')
    expect(a.reasons[0].kind).toBe('upDowns')
    expect(a.reasons[0].params.count).toBe(3)
  })

  it('makes two rolls in an hour URGENT', () => {
    const b = synthHistory(NOW, 20, (t, h, base) =>
      isToday(t) && h === 13 ? makeHour(t, { minutes: { lie: 6, roll: 2, eat: 20 }, rollingBouts: 2, upDowns: 2 }) : base,
    )
    expect(assess(horse, b, NOW).state).toBe('urgent')
  })

  it('makes lying still far longer than the longest normal bout URGENT', () => {
    const b = synthHistory(NOW, 20, (t, h, base) => {
      if (!isToday(t) || h < 11) return base
      return makeHour(t, { minutes: { lie: 60 }, coverage: 1, lyingBouts: h === 11 ? 1 : 0 })
    })
    const a = assess(donkey, b, NOW)
    expect(a.state).toBe('urgent')
    expect(a.reasons[0].kind).toBe('longLying')
  })

  it('makes a possible fall without return to normal movement URGENT', () => {
    const b = synthHistory(NOW, 20, (t, h, base) =>
      isToday(t) && h === 14 ? makeHour(t, { coverage: 1 / 3, minutes: { walk: 12, lie: 8 }, falls: 1, lyingBouts: 1, workMin: 12 }) : base,
    )
    const a = assess(horse, b, NOW)
    expect(a.state).toBe('urgent')
    expect(a.reasons[0].params.time).toBe('14:12')
  })

  it('does not keep a fall URGENT once the animal walks normally again', () => {
    const now = NOW + 2 * HOUR
    const b = synthHistory(now, 20, (t, h, base) => {
      if (!isToday(t)) return base
      if (h === 13) return makeHour(t, { minutes: { walk: 30, lie: 5, eat: 10 }, falls: 1, lyingBouts: 1, upDowns: 1 })
      return base
    })
    expect(assess(horse, b, now).state).not.toBe('urgent')
  })

  it('says NOT SURE with a baseline shorter than 3 days', () => {
    const young = animal('donkey', { tagSince: NOW - 2 * DAY })
    const b = synthHistory(NOW, 2)
    const a = assess(young, b, NOW)
    expect(a.state).toBe('not_sure')
    expect(a.reasons[0].kind).toBe('shortBaseline')
    expect(a.learning).toEqual({ day: 3, of: 5 })
  })

  it('says NOT SURE when the data is stale', () => {
    const b = synthHistory(NOW, 20).filter((h) => h.hourStart < NOW - 3 * HOUR)
    const a = assess(donkey, b, NOW)
    expect(a.state).toBe('not_sure')
    expect(a.reasons.some((r) => r.kind === 'stale')).toBe(true)
  })

  it('says NOT SURE when coverage in the last 24 hours is under 60%', () => {
    const b = synthHistory(NOW, 20, (t, _h, base) =>
      t > NOW - 24 * HOUR ? makeHour(t, { coverage: 0.5, minutes: { eat: 15, walk: 3 } }) : base,
    )
    const a = assess(donkey, b, NOW)
    expect(a.state).toBe('not_sure')
  })

  it('says CHECK for a dull donkey: less activity and eating, more lying', () => {
    const b = synthHistory(NOW, 20, (t, h, base) =>
      isToday(t) && h >= 10 ? makeHour(t, { minutes: { eat: 15, walk: 1, lie: 15 }, lyingBouts: 1, upDowns: 1 }) : base,
    )
    const a = assess(donkey, b, NOW)
    expect(['check', 'urgent']).toContain(a.state)
    expect(a.reasons.some((r) => r.kind === 'activity' || r.kind === 'eating')).toBe(true)
  })

  it('says WATER after long work without a water stop', () => {
    const b = synthHistory(NOW, 20, (t, h, base) => {
      if (!isToday(t) || h < 8) return base
      return makeHour(t, { minutes: { walk: 50 }, workMin: 55, climbM: 120, distanceKm: 3, tempC: 26, rh: 45 })
    })
    const a = assess(donkey, b, NOW)
    expect(a.state).toBe('water')
    expect(a.reasons.some((r) => r.kind === 'noRest')).toBe(true)
  })
})

describe('detectChanges', () => {
  it('finds every scripted logbook event in the data, at about the right time', () => {
    for (const a of getHerd()) {
      const found = detectChanges(a, getBudgets(a.id), NOW)
      for (const s of getDetectedChanges(a.id)) {
        const hit = found.find((f) => f.state === s.state && Math.abs(f.at - s.at) <= 3 * HOUR)
        expect(hit, `${a.name} ${s.state} at ${new Date(s.at).toISOString()}`).toBeDefined()
      }
    }
  })

  it('records the return to normal after a change', () => {
    const saba = detectChanges(herdMember('saba').animal, getBudgets('saba'), NOW)
    const ep = saba.find((c) => c.state === 'urgent')!
    expect(ep.resolved).toBe(true)
    expect(saba.some((c) => c.state === 'normal' && c.at > ep.at && c.at < ep.at + DAY)).toBe(true)
  })

  it('keeps false alarms rare: at most one change a fortnight per animal on average', () => {
    let changes = 0
    for (const a of getHerd()) changes += detectChanges(a, getBudgets(a.id), NOW).filter((c) => c.state !== 'normal').length
    expect(changes / 12).toBeLessThan(180 / 14)
  })

  it('copies owner feedback onto detected changes', () => {
    const merged = mergeFeedback(detectChanges(herdMember('saba').animal, getBudgets('saba'), NOW), getDetectedChanges('saba'))
    expect(merged.find((c) => c.state === 'urgent')?.feedback).toBe('called_help')
    expect(logbook('saba').find((c) => c.state === 'urgent')?.feedback).toBe('called_help')
  })

  it('leaves today\'s changes open', () => {
    const kito = logbook('kito')
    expect(kito[0].state).toBe('urgent')
    expect(kito[0].resolved).toBe(false)
    expect(kito[0].at).toBeGreaterThan(NOW - HOUR)
  })
})

