import type { StringTable } from '../i18n'

// Next steps for the owner or health worker. Each names the animal, a time or place, and what to
// look at. Never a diagnosis.
// Params named place and dir hold English text; placeKey and dirKey hold string keys for other
// languages.
// Amharic below is machine-made. It needs a native speaker check before anyone relies on it.
export const strings: StringTable = {
  en: {
    'forecast.rec.goNow': 'Go to {name} now. {name} is {km} km {dir} of the {place} and has not moved for {minutes} minutes.',
    'forecast.rec.goNowAt': 'Go to {name} now. {name} is at the {place} and has not moved for {minutes} minutes.',
    'forecast.rec.goNowNoPosition': 'Go to {name} now.',
    'forecast.rec.goNowStand':
      'Go to {name} now. {name} is {km} km {dir} of the {place} and has not moved for {minutes} minutes. Check if {name} can stand.',
    'forecast.rec.goNowAtStand': 'Go to {name} now. {name} is at the {place} and has not moved for {minutes} minutes. Check if {name} can stand.',
    'forecast.rec.goNowNoPositionStand': 'Go to {name} now. Check if {name} can stand.',
    'forecast.rec.restless': 'Stop work. Stay with {name} and watch for more rolling or getting up and down.',
    'forecast.rec.dullNotEating': 'Check gums and droppings. A donkey that stops eating needs help the same day.',
    'forecast.rec.callHelp': 'Call the animal health worker. Stop work for {name} today.',

    'forecast.rec.checkDonkey':
      'Look at {name} before evening work. Is {name} eating? Check gums and droppings. Dullness is the first sign of colic in donkeys.',
    'forecast.rec.checkHorse': 'Look at {name} within the hour. Is {name} eating? Check gums and droppings, and watch for rolling or pawing.',
    'forecast.rec.lookAgain': 'Look again at {time}. If {name} is still quiet or not eating, call the animal health worker.',
    'forecast.rec.noWorkUntilEating': 'Do not load {name} until {name} eats and walks as usual.',

    'forecast.rec.waterAt':
      "Stop {name} at the {place} before {before}. If work continues, {name}'s water deficit passes 5% of body weight at about {cross}.",
    'forecast.rec.waterSoon': 'Give {name} water at the {place} within the hour.',
    'forecast.rec.waterNow':
      "Give {name} water now. If work continues, {name}'s water deficit passes 5% of body weight at about {cross}.",
    'forecast.rec.waterNowPlain': 'Give {name} water now.',
    'forecast.rec.rest': 'Let {name} rest for 30 minutes with water before more work. {name} has worked {hours} hours since the last water stop.',
    'forecast.rec.heat': 'Keep work light while it is hot. Rest in shade.',
    'forecast.rec.heatUntil': 'Keep work light until it cools down at about {time}. Rest in shade.',

    'forecast.rec.learning': "The tag is still learning {name}'s normal (day {day} of {of}). Look at {name} yourself each morning and evening.",
    'forecast.rec.stale': "Check that {name}'s tag is on and charged. Look at {name} yourself.",
    'forecast.rec.lowConfidence': "The tag is not reading well. Check the collar fit and look at {name} yourself.",

    'forecast.rec.waterPlan': 'Offer {name} water by {time}. Without water, the deficit passes 3% of body weight then.',
    'forecast.rec.nothing': 'Nothing to do for {name} now.',

    'forecast.plan.continue_work': 'If work continues',
    'forecast.plan.rest_now': 'If {name} rests now',
    'forecast.plan.rest_at_water': 'If {name} rests at water',

    'forecast.dir.n': 'north',
    'forecast.dir.ne': 'north-east',
    'forecast.dir.e': 'east',
    'forecast.dir.se': 'south-east',
    'forecast.dir.s': 'south',
    'forecast.dir.sw': 'south-west',
    'forecast.dir.w': 'west',
    'forecast.dir.nw': 'north-west',
  },
  am: {
    'forecast.rec.goNow': 'አሁኑኑ ወደ {name} ይሂዱ። የመጨረሻ ቦታ፤ ከ{place} {dir} {km} ኪ.ሜ.፣ ከ{minutes} ደቂቃ በፊት።',
    'forecast.rec.goNowAt': 'አሁኑኑ ወደ {name} ይሂዱ። የመጨረሻ ቦታ፤ {place}፣ ከ{minutes} ደቂቃ በፊት።',
    'forecast.rec.goNowNoPosition': 'አሁኑኑ ወደ {name} ይሂዱ።',
    'forecast.rec.goNowStand': 'አሁኑኑ ወደ {name} ይሂዱ። የመጨረሻ ቦታ፤ ከ{place} {dir} {km} ኪ.ሜ.፣ ከ{minutes} ደቂቃ በፊት። {name} መቆም ይችል እንደሆነ ይመልከቱ።',
    'forecast.rec.goNowAtStand': 'አሁኑኑ ወደ {name} ይሂዱ። የመጨረሻ ቦታ፤ {place}፣ ከ{minutes} ደቂቃ በፊት። {name} መቆም ይችል እንደሆነ ይመልከቱ።',
    'forecast.rec.goNowNoPositionStand': 'አሁኑኑ ወደ {name} ይሂዱ። {name} መቆም ይችል እንደሆነ ይመልከቱ።',
    'forecast.rec.restless': 'ስራ ያቁሙ። ከ{name} ጋር ይቆዩና ተጨማሪ መንከባለል ወይም መተኛት መነሳት ካለ ይመልከቱ።',
    'forecast.rec.dullNotEating': 'ድዱንና ፋንድያውን ይመልከቱ። መብላት ያቆመ አህያ በዚያው ቀን እርዳታ ያስፈልገዋል።',
    'forecast.rec.callHelp': 'የእንስሳት ጤና ባለሙያ ይጥሩ። ዛሬ {name}ን አያሰሩት።',

    'forecast.rec.checkDonkey': 'ከማታ ስራ በፊት {name}ን ይመልከቱ። እየበላ ነው? ድዱንና ፋንድያውን ይመልከቱ። በአህያ የቁርጠት የመጀመሪያ ምልክት መደንዘዝ ነው።',
    'forecast.rec.checkHorse': 'በአንድ ሰዓት ውስጥ {name}ን ይመልከቱ። እየበላ ነው? ድዱንና ፋንድያውን ይመልከቱ፤ መንከባለል ወይም መቆፈር ካለ ይከታተሉ።',
    'forecast.rec.lookAgain': '{time} ላይ እንደገና ይመልከቱ። {name} አሁንም ፀጥ ካለ ወይም ካልበላ የእንስሳት ጤና ባለሙያ ይጥሩ።',
    'forecast.rec.noWorkUntilEating': '{name} እንደወትሮው እስኪበላና እስኪራመድ ድረስ ጭነት አይጫኑበት።',

    'forecast.rec.waterAt': '{name}ን ከ{before} በፊት {place} ላይ ያቁሙ። ስራው ከቀጠለ የ{name} የውሃ እጥረት በ{cross} አካባቢ ከሰውነት ክብደት 5% ያልፋል።',
    'forecast.rec.waterSoon': 'በአንድ ሰዓት ውስጥ ለ{name} {place} ላይ ውሃ ይስጡ።',
    'forecast.rec.waterNow': 'ለ{name} አሁን ውሃ ይስጡ። ስራው ከቀጠለ የውሃ እጥረቱ በ{cross} አካባቢ ከሰውነት ክብደት 5% ያልፋል።',
    'forecast.rec.waterNowPlain': 'ለ{name} አሁን ውሃ ይስጡ።',
    'forecast.rec.rest': 'ከተጨማሪ ስራ በፊት {name}ን ለ30 ደቂቃ ከውሃ ጋር ያሳርፉ። {name} ውሃ ከጠጣ ወዲህ {hours} ሰዓት ሰርቷል።',
    'forecast.rec.heat': 'ሙቀቱ እስካለ ድረስ ስራውን ያቅልሉ። በጥላ ያሳርፉ።',
    'forecast.rec.heatUntil': 'በ{time} አካባቢ እስኪቀዘቅዝ ድረስ ስራውን ያቅልሉ። በጥላ ያሳርፉ።',

    'forecast.rec.learning': 'መሳሪያው የ{name}ን መደበኛ ባህሪ እየተማረ ነው (ቀን {day} ከ{of})። ጠዋትና ማታ {name}ን ራስዎ ይመልከቱ።',
    'forecast.rec.stale': 'የ{name} መሳሪያ መታሰሩንና ኃይል እንዳለው ያረጋግጡ። {name}ን ራስዎ ይመልከቱ።',
    'forecast.rec.lowConfidence': 'መሳሪያው በደንብ እያነበበ አይደለም። የአንገት ማሰሪያውን ያስተካክሉና {name}ን ራስዎ ይመልከቱ።',

    'forecast.rec.waterPlan': 'እስከ {time} ድረስ ለ{name} ውሃ ያቅርቡ። ውሃ ካላገኘ እጥረቱ ያኔ ከሰውነት ክብደት 3% ያልፋል።',
    'forecast.rec.nothing': 'አሁን ለ{name} የሚደረግ ነገር የለም።',

    'forecast.plan.continue_work': 'ስራው ከቀጠለ',
    'forecast.plan.rest_now': '{name} አሁን ካረፈ',
    'forecast.plan.rest_at_water': '{name} ውሃ አጠገብ ካረፈ',

    'forecast.dir.n': 'በሰሜን',
    'forecast.dir.ne': 'በሰሜን ምሥራቅ',
    'forecast.dir.e': 'በምሥራቅ',
    'forecast.dir.se': 'በደቡብ ምሥራቅ',
    'forecast.dir.s': 'በደቡብ',
    'forecast.dir.sw': 'በደቡብ ምዕራብ',
    'forecast.dir.w': 'በምዕራብ',
    'forecast.dir.nw': 'በሰሜን ምዕራብ',
  },
}
