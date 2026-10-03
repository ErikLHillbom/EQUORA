import type { StringTable } from '../i18n'

// Reasons behind a state, as plain sentences. Each says what the tag saw.
// Amharic below is machine-made. It needs a native speaker check before anyone relies on it.
export const strings: StringTable = {
  en: {
    'alerts.state.normal': 'Normal',
    'alerts.state.water': 'Water',
    'alerts.state.check': 'Check',
    'alerts.state.urgent': 'Urgent',
    'alerts.state.not_sure': 'Not sure',

    'alerts.phrase.normal': '',
    'alerts.phrase.water': 'Offer water and let it rest.',
    'alerts.phrase.check': 'Look at your animal. Is it eating? Check gums and droppings.',
    'alerts.phrase.urgent': 'Stop work. Get help now.',
    'alerts.phrase.not_sure': 'I cannot tell. Check the animal yourself.',

    'alerts.learning': "Learning {name}'s normal. Day {day} of {of}.",

    'alerts.reason.normal': "Activity, lying and eating are within {name}'s normal.",
    'alerts.reason.backToNormal': "Back to {name}'s normal.",

    'alerts.reason.fall': 'Possible fall at {time}: a hard impact, a fast turn, then lying. No real movement since.',
    'alerts.reason.upDowns': '{name} got up and lay down {count} times within an hour, from {time}.',
    'alerts.reason.rolling': '{name} rolled {count} times within an hour, from {time}.',
    'alerts.reason.longLying':
      "{name} has been lying still for {minutes} minutes. {name}'s longest lying bout in the last 14 days was {longest} minutes.",
    'alerts.reason.dullNotEating':
      "Activity {activityPct}% and eating {eatingPct}% below {name}'s normal, for {hours} hours.",

    'alerts.reason.shortBaseline': "The tag has {days} days of data. It needs 3 days to learn {name}'s normal.",
    'alerts.reason.stale': 'No data from the tag for {hours} hours.',
    'alerts.reason.lowCoverage': 'The tag recorded only {pct}% of the last 24 hours.',
    'alerts.reason.lowConfidence': 'The tag could not tell what {name} was doing for {pct}% of the last 3 hours.',

    'alerts.reason.activityDown': "Activity {pct}% below {name}'s normal for this time of day.",
    'alerts.reason.eatingDown': "Eating {pct}% below {name}'s normal for this time of day.",
    'alerts.reason.lyingUp': 'Lying {ratio} times longer than usual for this time of day.',
    'alerts.reason.lyingUpAfterWork': 'Lying {ratio} times longer than usual after similar work.',
    'alerts.reason.lyingMinutes': '{name} lay down for {minutes} minutes in the last {hours} hours. Usually close to none at this time.',
    'alerts.reason.cusum': "Activity has stayed below {name}'s normal for {hours} hours.",
    'alerts.reason.restless': '{name} got up and down twice and rolled within an hour, from {time}.',

    'alerts.reason.waterDebt': 'Water deficit about {pct}% of body weight.',
    'alerts.reason.waterDebtHigh': 'Water deficit about {pct}% of body weight. That is high.',
    'alerts.reason.noRest': 'Worked {hours} hours without a water stop.',
    'alerts.reason.noRestSince': 'Worked {hours} hours since the last water stop at {since}.',
    'alerts.reason.heat': 'Hot: {temp} °C, comfort index {index}.',
    'alerts.reason.heatDonkey': 'Hot: {temp} °C, comfort index {index}. The index is made for horses and is likely conservative for a donkey.',
  },
  am: {
    'alerts.state.normal': 'መደበኛ',
    'alerts.state.water': 'ውሃ',
    'alerts.state.check': 'ይመልከቱ',
    'alerts.state.urgent': 'አስቸኳይ',
    'alerts.state.not_sure': 'እርግጠኛ አይደለም',

    'alerts.phrase.normal': '',
    'alerts.phrase.water': 'ውሃ ይስጡትና ያሳርፉት።',
    'alerts.phrase.check': 'እንስሳዎን ይመልከቱ። እየበላ ነው? ድዱንና ፋንድያውን ይመልከቱ።',
    'alerts.phrase.urgent': 'ስራ ያቁሙ። አሁን እርዳታ ይጥሩ።',
    'alerts.phrase.not_sure': 'መለየት አልቻልኩም። እንስሳውን ራስዎ ይመልከቱ።',

    'alerts.learning': 'የ{name}ን መደበኛ ባህሪ እየተማርኩ ነው። ቀን {day} ከ{of}።',

    'alerts.reason.normal': 'የ{name} እንቅስቃሴ፣ መተኛትና መብላት በመደበኛው ውስጥ ናቸው።',
    'alerts.reason.backToNormal': '{name} ወደ መደበኛው ተመልሷል።',

    'alerts.reason.fall': 'ምናልባት {time} ላይ ወድቋል፤ ጠንካራ ግጭት፣ ፈጣን መዞር፣ ከዚያ መተኛት። ከዚያ ወዲህ አልተንቀሳቀሰም።',
    'alerts.reason.upDowns': '{name} ከ{time} ጀምሮ በአንድ ሰዓት ውስጥ {count} ጊዜ ተኝቶ ተነስቷል።',
    'alerts.reason.rolling': '{name} ከ{time} ጀምሮ በአንድ ሰዓት ውስጥ {count} ጊዜ ተንከባሏል።',
    'alerts.reason.longLying': '{name} ለ{minutes} ደቂቃ ሳይንቀሳቀስ ተኝቷል። ባለፉት 14 ቀናት ረጅሙ መተኛት {longest} ደቂቃ ነበር።',
    'alerts.reason.dullNotEating': 'እንቅስቃሴ በ{activityPct}% እና መብላት በ{eatingPct}% ከ{name} መደበኛ በታች ናቸው፤ ለ{hours} ሰዓት።',

    'alerts.reason.shortBaseline': 'መሳሪያው የ{days} ቀን መረጃ ብቻ አለው። የ{name}ን መደበኛ ለመማር 3 ቀን ያስፈልገዋል።',
    'alerts.reason.stale': 'ለ{hours} ሰዓት ከመሳሪያው መረጃ አልመጣም።',
    'alerts.reason.lowCoverage': 'መሳሪያው ካለፉት 24 ሰዓታት {pct}% ብቻ መዝግቧል።',
    'alerts.reason.lowConfidence': 'ባለፉት 3 ሰዓታት {pct}% ጊዜ {name} ምን እንደሚያደርግ መሳሪያው መለየት አልቻለም።',

    'alerts.reason.activityDown': 'እንቅስቃሴ ለዚህ ሰዓት ከ{name} መደበኛ በ{pct}% ያነሰ ነው።',
    'alerts.reason.eatingDown': 'መብላት ለዚህ ሰዓት ከ{name} መደበኛ በ{pct}% ያነሰ ነው።',
    'alerts.reason.lyingUp': 'ለዚህ ሰዓት ከወትሮው {ratio} እጥፍ ረዘም ብሎ ተኝቷል።',
    'alerts.reason.lyingUpAfterWork': 'ከተመሳሳይ ስራ በኋላ ከወትሮው {ratio} እጥፍ ረዘም ብሎ ተኝቷል።',
    'alerts.reason.lyingMinutes': '{name} ባለፉት {hours} ሰዓታት {minutes} ደቂቃ ተኝቷል። በዚህ ሰዓት ብዙውን ጊዜ አይተኛም።',
    'alerts.reason.cusum': 'እንቅስቃሴ ለ{hours} ሰዓታት ከ{name} መደበኛ በታች ቆይቷል።',
    'alerts.reason.restless': '{name} ከ{time} ጀምሮ በአንድ ሰዓት ውስጥ ሁለት ጊዜ ተኝቶ ተነስቷል፣ ተንከባሏልም።',

    'alerts.reason.waterDebt': 'የውሃ እጥረት ከሰውነት ክብደት {pct}% ያህል ነው።',
    'alerts.reason.waterDebtHigh': 'የውሃ እጥረት ከሰውነት ክብደት {pct}% ያህል ነው። ይህ ከፍተኛ ነው።',
    'alerts.reason.noRest': 'ውሃ ሳይጠጣ {hours} ሰዓት ሰርቷል።',
    'alerts.reason.noRestSince': 'በ{since} ውሃ ከጠጣ ወዲህ {hours} ሰዓት ሰርቷል።',
    'alerts.reason.heat': 'ሞቃት፤ {temp} °C፣ የምቾት መለኪያ {index}።',
    'alerts.reason.heatDonkey': 'ሞቃት፤ {temp} °C፣ የምቾት መለኪያ {index}። መለኪያው ለፈረስ የተሰራ ሲሆን ለአህያ ጥንቃቄ ያበዛል።',
  },
}
