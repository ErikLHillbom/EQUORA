// Every source the app cites (SPEC 12), with a short tag for inline citations.
// Citations are bibliographic data and are not translated.

export interface Source {
  id: string
  /** Inline tag, e.g. "Asteraye et al. 2026". */
  short: string
  /** Full reference as listed in SPEC 12. */
  cite: string
  url: string
  /** The figures we take from it. */
  note?: string
}

export interface SourceGroup {
  /** String table key for the group heading. */
  titleKey: string
  sources: Source[]
}

export const SOURCE_GROUPS: readonly SourceGroup[] = [
  {
    titleKey: 'data.sources.value',
    sources: [
      {
        id: 'asteraye2026',
        short: 'Asteraye et al. 2026',
        cite: 'Asteraye GB, Jobling R, Jemberu WT, et al. 2026. Estimating the economic value of working donkeys in Ethiopia. Preventive Veterinary Medicine 254:106926.',
        url: 'https://doi.org/10.1016/j.prevetmed.2026.106926',
        note: 'USD 567 a year (95% PI 479 to 660), up to 21% of household income, up to 16.5 hours of labour a week',
      },
      {
        id: 'asteraye2024',
        short: 'Asteraye et al. 2024',
        cite: 'Asteraye GB et al. 2024. Population, distribution, biomass, and economic value of equids in Ethiopia. PLOS ONE.',
        url: 'https://doi.org/10.1371/journal.pone.0295388',
        note: 'Donkey USD 74.8 (range 47.6 to 98), horse USD 151.8; 10.7 million donkeys and 2.1 million horses (CSA 2020)',
      },
      {
        id: 'brooke',
        short: 'Brooke',
        cite: 'Brooke. Working equids data.',
        url: 'https://www.thebrooke.org/our-work/data-working-equids',
        note: '116 million equids worldwide',
      },
      {
        id: 'un2025',
        short: 'UN News 2025',
        cite: 'UN News 2025, World Horse Day, citing WOAH and FAO.',
        url: 'https://news.un.org/en/story/2025/07/1165370',
        note: '112 million working equids support about 600 million people',
      },
      {
        id: 'geiger2020',
        short: 'Geiger et al. 2020',
        cite: 'Geiger M et al. 2020. Understanding the attitudes of communities to the social, economic, and cultural importance of working donkeys in rural, peri-urban, and urban areas of Ethiopia. Frontiers in Veterinary Science 7:60.',
        url: 'https://doi.org/10.3389/fvets.2020.00060',
        note: 'A sick or dead donkey ends transport income and savings group payments',
      },
      {
        id: 'merridale2024women',
        short: 'Merridale-Punter et al. 2024b',
        cite: 'Merridale-Punter MS, Zewdu H, Tefera G, et al. 2024. "The health of my donkey is my health": a female perspective on the contributions of working equids to One Health in two Ethiopian communities. CABI One Health 3(1).',
        url: 'https://doi.org/10.1079/cabionehealth.2024.0023',
        note: 'Interviews with 10 women in Oromia and Amhara',
      },
    ],
  },
  {
    titleKey: 'data.sources.health',
    sources: [
      {
        id: 'worku2017',
        short: 'Worku et al. 2017',
        cite: 'Worku Y et al. 2017. Equine colic: clinical epidemiology and associated risk factors in and around Debre Zeit. Tropical Animal Health and Production.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28401328/',
        note: 'Colic 10.3% of cases; 15.4% of colic cases died (10 of 65); 63% of colic cases were donkeys',
      },
      {
        id: 'benedetti2024',
        short: 'Benedetti et al. 2024',
        cite: 'Benedetti B et al. 2024. A retrospective study on working equids admitted to an equine clinic in Cairo. Animals 14(5):817.',
        url: 'https://doi.org/10.3390/ani14050817',
      },
      {
        id: 'donkeysanctuary',
        short: 'The Donkey Sanctuary',
        cite: 'The Donkey Sanctuary. Colic in donkeys.',
        url: 'https://www.thedonkeysanctuary.org.uk/for-owners/owners-resources/colic-in-donkeys',
        note: 'Donkeys hide pain; dullness is often the first sign',
      },
      {
        id: 'mathewos2021',
        short: 'Mathewos et al. 2021',
        cite: 'Mathewos M et al. 2021. Gastrointestinal helminthiasis in horses and donkeys of Hawassa. Veterinary Medicine International.',
        url: 'https://doi.org/10.1155/2021/6686688',
        note: '78.5% infected; donkeys 91.9%, horses 63.7%',
      },
      {
        id: 'getahun2024',
        short: 'Getahun et al. 2024',
        cite: 'Getahun YA et al. 2024. Equine helminths in Gamo Gofa Zone. Journal of Veterinary Science.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38834511/',
        note: '90.4% infected',
      },
      {
        id: 'merridale2022',
        short: 'Merridale-Punter et al. 2022',
        cite: 'Merridale-Punter MS et al. 2022. Working equid lameness: systematic review and meta-analysis. Animals 12(22):3100.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36428328/',
        note: 'Lameness 29.9% (95% CI 17 to 47); gait abnormality 62.9% (95% CI 31 to 87)',
      },
      {
        id: 'merridale2024',
        short: 'Merridale-Punter et al. 2024a',
        cite: 'Merridale-Punter MS et al. 2024. Equipment-related wounds in working equids of Oromia. Animal Welfare 33:e42.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39600354/',
        note: '72.6% of 369 animals',
      },
      {
        id: 'bukhari2022',
        short: 'Bukhari et al. 2022',
        cite: 'Bukhari SSUH et al. 2022. Welfare concerns for mounted load carrying by working donkeys in Pakistan. Frontiers in Veterinary Science.',
        url: 'https://doi.org/10.3389/fvets.2022.886020',
        note: '332 owners; 87.4% carried more than half bodyweight; 43.4% of donkeys sometimes lie down after loading',
      },
    ],
  },
  {
    titleKey: 'data.sources.sensors',
    sources: [
      {
        id: 'eerdekens2024',
        short: 'Eerdekens et al. 2024',
        cite: 'Eerdekens A et al. 2024. Automatic early detection of induced colic in horses using accelerometer devices. Equine Veterinary Journal 56(6):1229-1242.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38318654',
        note: '91.2% accuracy, front-leg sensors, 8 mares with induced colic',
      },
      {
        id: 'giannone2025',
        short: 'Giannone et al. 2025',
        cite: 'Giannone et al. 2025. Scoping review of technology to monitor horse behaviour and health. Journal of Equine Veterinary Science 155.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/41242474/',
      },
      {
        id: 'eerdekens2020',
        short: 'Eerdekens et al. 2020',
        cite: 'Eerdekens A et al. 2020. Automatic equine activity detection by convolutional neural networks using accelerometer data. Computers and Electronics in Agriculture 168:105139.',
        url: 'https://doi.org/10.1016/j.compag.2019.105139',
        note: 'The 25 Hz result',
      },
      {
        id: 'congiu2024',
        short: 'Congiu et al. 2024',
        cite: 'Congiu M et al. 2024. Using tri-axial accelerometers data to predict behavior activity of grazing donkeys. Computers and Electronics in Agriculture 227:109582.',
        url: 'https://doi.org/10.1016/j.compag.2024.109582',
        note: '11 donkeys at pasture; data not public',
      },
      {
        id: 'auer2021',
        short: 'Auer et al. 2021',
        cite: 'Auer U et al. 2021. Review of horse time budgets.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8002676/',
      },
    ],
  },
  {
    titleKey: 'data.sources.datasets',
    sources: [
      {
        id: 'kamminga2019',
        short: 'Kamminga et al. 2019',
        cite: 'Kamminga JW, Janßen LM, Meratnia N, Havinga PJM. 2019. Horsing Around: a dataset comprising horse movement. Data 4(4):131.',
        url: 'https://doi.org/10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14',
        note: 'CC0',
      },
      {
        id: 'nasapower',
        short: 'NASA POWER',
        cite: 'NASA POWER hourly API.',
        url: 'https://power.larc.nasa.gov/docs/services/api/temporal/hourly/',
        note: 'Hourly air temperature and humidity for the demo area',
      },
    ],
  },
  {
    titleKey: 'data.sources.context',
    sources: [
      {
        id: 'fao',
        short: 'FAO',
        cite: 'FAO, n.d. Annex 6: Coffee growing in Ethiopia (doc X6939E).',
        url: 'https://www.fao.org/4/x6939e/X6939e12.htm',
        note: '12 hours to get cherries to a pulpery',
      },
    ],
  },
]

const BY_ID = new Map(SOURCE_GROUPS.flatMap((g) => g.sources).map((s) => [s.id, s]))

export function sourceById(id: string): Source {
  const s = BY_ID.get(id)
  if (!s) throw new Error(`Unknown source: ${id}`)
  return s
}
