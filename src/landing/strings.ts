import type { StringTable } from '../i18n'

// "Why it matters": a short field report. Figures arrive as {placeholders} from the FIGURES table
// in WhyScreen.tsx, each with its source shown next to it. English only for now; Amharic falls
// back to English.
export const strings: StringTable = {
  en: {
    'why.title': 'Why it matters',
    'why.kicker': 'Field report',
    'why.coords': 'Demo area',
    'why.intro':
      'Coffee farmers near Yirgacheffe use donkeys and horses to carry cherries, water and grain. This page sets out what one animal is worth to a household and where the tag fits.',
    'why.drawing': 'A working donkey, walking. From our own posture drawings.',

    'why.value.h': 'What a working donkey does for a household',
    'why.value.worth': 'In Ethiopia a working donkey is worth about USD {usd} a year to its household after its costs (95% PI {low} to {high}).',
    'why.value.income': 'That is up to {pct}% of household income. The donkey also saves its household up to {hours} hours of human labour a week.',
    'why.value.herd': 'Ethiopia has about {donkeys} million donkeys and {horses} million horses.',
    'why.value.coffee': 'Coffee cherries must reach a pulpery within {hours} hours of picking, so the trip from the slope cannot wait.',

    // The key figure of a sentence, repeated in the margin. Same figure, same source.
    'why.fig.aboutUsd': 'About USD {n}',
    'why.fig.upToPct': 'Up to {n}%',
    'why.fig.million': '{n} million',
    'why.fig.withinHours': 'Within {n} h',
    'why.fig.ofN': '{n} of {of}',
    'why.fig.worth': 'A year to its household, after costs',
    'why.fig.income': 'Of household income',
    'why.fig.donkeys': 'Donkeys in Ethiopia',
    'why.fig.cherry': 'From picking to the pulpery',
    'why.fig.price': 'A new donkey at market',
    'why.fig.women': 'Women interviewed',
    'why.fig.colic': 'Colic cases at the clinic died',

    'why.loss.h': 'What losing one means',
    'why.loss.work': 'The carrying stops the same day: water, farm loads and trips to market.',
    'why.loss.income':
      'Owners interviewed across Ethiopia said a sick or dead donkey cut their transport income and their payments into savings groups (iqub and idir).',
    'why.loss.price': 'A new donkey costs about USD {donkey} at market (range USD {low} to {high}). A horse costs about USD {horse}.',
    'why.loss.women':
      'The work goes back to people. In interviews with {n} women who use working equids in Oromia and Amhara, women described carrying water and loads themselves when their animal was sick.',

    'why.gap.h': 'The gap',
    'why.gap.late': 'Owners notice too late. Donkeys hide pain, and their first sign is often only dullness.',
    'why.gap.clinic':
      'At the clinic in Debre Zeit, colic was {share}% of cases. Of {cases} colic cases, {died} died ({diedPct}%), and {donkeys}% of the colic cases were donkeys.',

    'why.tag.h': 'What the tag does',
    'why.tag.learn': "It learns one animal's normal over its first {days} days: how much it moves, lies and eats at each hour.",
    'why.tag.check': 'When the animal departs from its own normal, the light changes and the tag says: "{phrase}"',
    'why.tag.never': 'It never says colic. It says check, and a person makes the call.',
    'why.tag.lying':
      'One lying bout is never an alarm. {pct}% of pack donkey owners in Pakistan said their donkeys sometimes lie down after loading.',
    'why.tag.offline': 'It works with no signal. Data stays on the tag and the phone.',
    'why.tag.amharic': 'It speaks Amharic. The voice is machine-made for now and needs a native speaker to check it.',
    'why.tag.blind': 'It cannot see droppings, gums, sweating or heart rate. The owner checks those.',

    'why.math.h': 'The math',
    'why.math.caption': 'One tag against one donkey',
    'why.math.item': 'Item',
    'why.math.cost': 'USD',
    'why.math.parts': 'Tag parts, estimate',
    'why.math.value': 'Donkey, value to its household per year',
    'why.math.price': 'New donkey at market',
    'why.math.partsValue': '{low} to {high}',
    'why.math.valueValue': '{usd}',
    'why.math.priceValue': 'about {usd}',
    'why.math.share':
      'At the top of the estimate, one tag costs {pct}% of what a working donkey is worth to its household in a year, and {pricePct}% of the price of a new donkey.',
    'why.math.rough': 'The parts estimate is rough and unverified. Nobody has built the tag yet. A cooperative or an NGO would lend the tags to owners.',
    'why.math.limit': "A tag does not prevent colic. It moves the owner's first look earlier.",

    'why.cta.herd': 'See the herd',
    'why.cta.tag': 'Try the tag',
    'why.cta.data': 'About the data',
  },
}
