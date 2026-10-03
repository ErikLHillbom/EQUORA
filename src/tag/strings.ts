import type { StringTable } from '../i18n'

// The five owner phrases (SPEC 5). NORMAL says nothing.
// The Amharic lines are machine-made and need a native speaker check (SPEC 10). Until then the
// app shows "machine voice, needs a native speaker check" next to them.
export const strings: StringTable = {
  en: {
    'tag.phrase.water': 'Offer water and let it rest.',
    'tag.phrase.check': 'Look at your animal. Is it eating? Check gums and droppings.',
    'tag.phrase.urgent': 'Stop work. Get help now.',
    'tag.phrase.not_sure': 'I cannot tell. Check the animal yourself.',
    'tag.voice.machine': 'Machine voice, needs a native speaker check',
  },
  am: {
    // Needs a native speaker check.
    'tag.phrase.water': 'ውሃ አጠጣው፣ እንዲያርፍም ተወው።',
    // Needs a native speaker check.
    'tag.phrase.check': 'እንስሳህን ተመልከት። እየበላ ነው? ድዱን እና ፋንድያውን ፈትሽ።',
    // Needs a native speaker check.
    'tag.phrase.urgent': 'ሥራ አቁም። አሁኑኑ እርዳታ ጥራ።',
    // Needs a native speaker check.
    'tag.phrase.not_sure': 'ማወቅ አልቻልኩም። እንስሳውን ራስህ ፈትሽ።',
    // Needs a native speaker check.
    'tag.voice.machine': 'የማሽን ድምፅ ነው፤ በአፍ መፍቻ ተናጋሪ መረጋገጥ አለበት',
  },
}
