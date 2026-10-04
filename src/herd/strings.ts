import type { StringTable } from '../i18n'

// Herd home and Statistics. Sentence case; short labels are set in caps by CSS.
// Amharic falls back to English for now.
export const strings: StringTable = {
  en: {
    'herd.title': 'Aricha cooperative',
    'herd.kicker': '{count} tagged animals near Yirgacheffe',
    'herd.coords.label': 'Demo area',
    'herd.coords.town': 'Yirgacheffe',
    'herd.coords.zone': 'Gedeo zone',
    'herd.coords.time': '{time} local',

    'herd.first.heading': 'Visit first',
    'herd.first.calm': 'Every animal is within its own normal',
    'herd.first.go': 'Go to {name}',
    'herd.first.open': 'Open {name}',
    'herd.first.drawing': '{name}, {pose}',
    'herd.first.next': 'Next step',

    'herd.counts.heading': 'The herd now',
    'herd.counts.item': '{count} {state}',
    'herd.counts.filtered': 'Showing {state} only.',
    'herd.counts.showAll': 'Show all animals',

    'herd.list.heading': 'Animals',
    'herd.list.note': 'Most urgent first, then by name.',
    'herd.list.empty': 'No animal is in this state now.',

    'herd.card.ids': '{species} · {household} · {tag}',
    'herd.card.visitFirst': 'Visit first',
    'herd.card.activity': 'Activity',
    'herd.card.doing': 'Doing',
    'herd.card.updated': 'Updated',
    'herd.card.learning': 'Learning',
    'herd.card.activityNone': 'Too little free time to measure',
    'herd.card.ageNow': 'Now',
    'herd.card.ageMin': '{minutes} min ago',
    'herd.card.ageHours': '{hours} h ago',
    'herd.card.updatedNow': 'Updated now',
    'herd.card.updatedMin': 'Updated {minutes} min ago',
    'herd.card.updatedHours': 'Updated {hours} h ago',

    'herd.household.domorso': 'Domorso',
    'herd.household.konga': 'Konga',
    'herd.household.haru': 'Haru road',
    'herd.household.benko': 'Benko',
    'herd.household.adido': 'Adido road',

    'herd.why': 'Why this matters',

    'herd.stats.kicker': 'Aricha cooperative, {count} animals',
    'herd.stats.ledger.heading': 'Today by animal',
    'herd.stats.ledger.caption': 'Since midnight, most urgent first',
    'herd.stats.col.animal': 'Animal',
    'herd.stats.col.km': 'Walked, km',
    'herd.stats.col.climb': 'Climb, m',
    'herd.stats.col.work': 'Work, h',
    'herd.stats.col.lying': 'Lying, h',
    'herd.stats.col.activity': 'Activity vs own normal, last {hours} h',
    'herd.stats.col.species': 'Species',
    'herd.stats.dash': '-',
    'herd.stats.ledger.note':
      'Activity is compared with the animal\'s own normal for the same hours, over the last {hours} hours of free time. A dash means there was too little free time to measure, or the tag is still learning the normal.',
    'herd.stats.scrollHint': 'The table scrolls sideways.',

    'herd.stats.insights.heading': 'Herd insights',
    'herd.stats.insights.note': 'Computed on this phone from the simulated herd data.',

    'herd.stats.top.heading': 'Deviating most from own normal',
    'herd.stats.top.caption': 'Last {hours} hours, outside the normal band',
    'herd.stats.col.signal': 'Signal',
    'herd.stats.col.change': 'Change',
    'herd.stats.signal.activity': 'Activity',
    'herd.stats.signal.eating': 'Eating',
    'herd.stats.signal.lying': 'Lying',
    'herd.stats.top.none': 'No animal is outside its own normal band in the last {hours} hours.',
    'herd.stats.top.lyingNote':
      'Lying alone is never an alarm. 43% of pack donkeys in one study sometimes lie down after loading (Bukhari et al. 2022).',

    'herd.insight.below0': 'No animal is below its own normal activity in the last {hours} hours.',
    'herd.insight.below1': '1 animal is below its own normal activity in the last {hours} hours: {names}.',
    'herd.insight.belowMany': '{count} animals are below their own normal activity at the same time, in the last {hours} hours: {names}.',
    'herd.insight.workUp':
      'Animals of the {group} worked {pct}% more hours in the last 7 days than in the 7 days before: {now} h against {before} h.',
    'herd.insight.workDown':
      'Animals of the {group} worked {pct}% fewer hours in the last 7 days than in the 7 days before: {now} h against {before} h.',
    'herd.insight.workSame':
      'Every household worked about the same hours in the last 7 days as in the 7 days before, within {same}%.',
    'herd.insight.distanceUp': 'The herd walked {now} km in the last 7 days, {pct}% more than in the 7 days before ({before} km).',
    'herd.insight.distanceDown': 'The herd walked {now} km in the last 7 days, {pct}% less than in the 7 days before ({before} km).',
    'herd.insight.distanceSame': 'The herd walked {now} km in the last 7 days, about the same as in the 7 days before ({before} km).',
    'herd.insight.heatDown':
      'On the {count} hottest afternoons of the last 7 days ({hot} °C at the tags), herd activity in free time was {pct}% lower than on the other {other} afternoons ({cool} °C).',
    'herd.insight.heatUp':
      'On the {count} hottest afternoons of the last 7 days ({hot} °C at the tags), herd activity in free time was {pct}% higher than on the other {other} afternoons ({cool} °C).',
    'herd.insight.heatSame':
      'On the {count} hottest afternoons of the last 7 days ({hot} °C at the tags), herd activity in free time was about the same as on the other {other} afternoons ({cool} °C).',
    'herd.insight.heatFlat':
      'Every afternoon in the last 7 days was between {min} and {max} °C at the tags. That is too close to tell whether heat changed activity.',
  },
}
