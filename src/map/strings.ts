import type { StringTable } from '../i18n'

// Amharic lines are machine-made and need a native speaker check (SPEC 10).
// Lines with no Amharic yet show in English.
export const strings: StringTable = {
  en: {
    'map.offline.missing': 'Map tiles for this area are not saved on this phone.',
    'map.offline.loading': 'Loading the map of this area.',
    'map.attribution': '© OpenStreetMap contributors, Protomaps, Mapterhorn, Copernicus',
    'map.area': 'Yirgacheffe, Gedeo zone, Ethiopia',

    'map.region': 'Map of the herd around Yirgacheffe',
    'map.positions': 'Positions are simulated. The tag has no GPS yet.',
    'map.list.toggle': 'Animal list',
    'map.list.heading': 'Animals on this map',
    'map.showAll': 'Whole herd',
    'map.marker.label': '{name}, {state}',
    'map.legend.route': 'Route today',

    'map.panel.close': 'Close',
    'map.panel.caseFile': 'Open case file',
    'map.panel.next': 'What to do',
    'map.panel.distance': 'Distance today',
    'map.panel.climb': 'Climbed today',
    'map.panel.work': 'Working time',
    'map.panel.workload': 'Workload',
    'map.panel.workloadNone': 'No work',
    'map.panel.position': 'Position at {time}, {where}.',
    'map.panel.positionNone': 'The tag sent no position today.',
    'map.panel.timeAgo': '{time} ({min} min ago)',
    'map.panel.where': '{km} km {dir} of the {place}',
    'map.panel.whereAt': 'at the {place}',

    'map.unit.km': '{n} km',
    'map.unit.m': '{n} m',
    'map.unit.hMin': '{h} h {m} min',
    'map.unit.min': '{m} min',
    'map.unit.of100': '{n} of 100',

    'map.fact.climbsOne': '{name} climbed uphill once today, {m} m.',
    'map.fact.climbsMany': '{name} climbed uphill {n} times today. The longest climb was {m} m.',
    'map.fact.climbsNone': '{name} did not climb a slope today.',
  },
  am: {
    // Needs a native speaker check.
    'map.offline.missing': 'የዚህ አካባቢ ካርታ በዚህ ስልክ ላይ አልተቀመጠም።',
    // Needs a native speaker check.
    'map.offline.loading': 'የዚህ አካባቢ ካርታ በመጫን ላይ ነው።',
    // Needs a native speaker check.
    'map.area': 'ይርጋጨፌ፣ ጌዴኦ ዞን፣ ኢትዮጵያ',
  },
}
