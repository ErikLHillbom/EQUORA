import type { StringTable } from '../i18n'

// Labels shown by the shared primitives and the app shell. Keys start with "shared.".
// Sentence case in the table. Short labels may be set in caps by CSS (DESIGN 5).
//
// The Amharic table is machine-made and has not been checked by a native speaker.
// The app labels it as such until someone checks it (SPEC 10).

export const strings: StringTable = {
  en: {
    'shared.app.name': 'Equora',
    'shared.app.home': 'Equora, home',

    'shared.state.normal': 'Normal',
    'shared.state.water': 'Water',
    'shared.state.check': 'Check',
    'shared.state.urgent': 'Urgent',
    'shared.state.not_sure': 'Not sure',

    'shared.stamp.simulated': 'Simulated data',
    'shared.stamp.experimental': 'Experimental',
    'shared.stamp.learning': "Learning {name}'s normal. Day {day} of {of}.",
    'shared.stamp.placeholder': 'Placeholder drawing',

    'shared.feedback.fine': 'Checked: fine',
    'shared.feedback.not_eating': 'Checked: not eating',
    'shared.feedback.called_help': 'Called for help',
    'shared.feedback.treated': 'Treated',

    'shared.nav.label': 'Main',
    'shared.nav.herd': 'Herd',
    'shared.nav.map': 'Map',
    'shared.nav.tag': 'Tag',
    'shared.nav.stats': 'Stats',
    'shared.nav.data': 'Data',

    'shared.lang.label': 'Language',
    'shared.lang.en': 'English',
    'shared.lang.am': 'Amharic',
    'shared.lang.machine': 'Machine translation. A native speaker has not checked it yet.',

    'shared.screen.herd': 'Animals',
    'shared.screen.map': 'Map',
    'shared.screen.animal': 'Animal',
    'shared.screen.tag': 'Tag',
    'shared.screen.stats': 'Statistics',
    'shared.screen.data': 'About the data',
    'shared.screen.why': 'Why it matters',
    'shared.screen.specimen': 'Specimen sheet',
    'shared.screen.notFound': 'This page is not in the notebook.',
    'shared.screen.backHome': 'Back to the herd',

    'shared.today.normalFor': 'Normal for {name}: {low} to {high} {unit}',
    'shared.today.normalForNoUnit': 'Normal for {name}: {low} to {high}',
    'shared.today.learning': 'Normal not learned yet',
    'shared.today.noData': 'No data',
    'shared.dotbar.label': 'Today {value}. Normal {low} to {high}.',
    'shared.dotbar.outside': 'Today {value} is outside the normal {low} to {high}.',

    'shared.chart.now': 'Now',
    'shared.chart.normalBand': 'Normal band',
    'shared.chart.actual': 'Measured',
    'shared.chart.forecast': 'Expected',
    'shared.chart.forecastRange': 'Likely range',

    'shared.pose.standing': 'Standing',
    'shared.pose.walking': 'Walking',
    'shared.pose.trotting': 'Trotting',
    'shared.pose.grazing': 'Grazing',
    'shared.pose.lying': 'Lying',
    'shared.pose.stale': 'Old data',
    'shared.species.horse': 'Horse',
    'shared.species.donkey': 'Donkey',
    'shared.species.mule': 'Mule',

    'shared.lens.label': 'Tag light: {state}',
    'shared.play': 'Play',
    'shared.pause': 'Pause',
    'shared.stop': 'Stop',
  },
  am: {
    'shared.app.name': 'Equora',
    'shared.app.home': 'Equora፣ መነሻ',

    'shared.state.normal': 'መደበኛ',
    'shared.state.water': 'ውሃ',
    'shared.state.check': 'ይመልከቱ',
    'shared.state.urgent': 'አስቸኳይ',
    'shared.state.not_sure': 'እርግጠኛ አይደለም',

    'shared.stamp.simulated': 'የተመሰለ መረጃ',
    'shared.stamp.experimental': 'የሙከራ',
    'shared.stamp.learning': 'የ{name}ን መደበኛ በመማር ላይ። ቀን {day} ከ{of}።',
    'shared.stamp.placeholder': 'ጊዜያዊ ስዕል',

    'shared.feedback.fine': 'ታይቷል፡ ደህና ነው',
    'shared.feedback.not_eating': 'ታይቷል፡ አይበላም',
    'shared.feedback.called_help': 'እርዳታ ተጠርቷል',
    'shared.feedback.treated': 'ታክሟል',

    'shared.nav.label': 'ዋና',
    'shared.nav.herd': 'መንጋ',
    'shared.nav.map': 'ካርታ',
    'shared.nav.tag': 'መለያ',
    'shared.nav.stats': 'ቁጥሮች',
    'shared.nav.data': 'መረጃ',

    'shared.lang.label': 'ቋንቋ',
    'shared.lang.en': 'እንግሊዝኛ',
    'shared.lang.am': 'አማርኛ',
    'shared.lang.machine': 'የማሽን ትርጉም። የቋንቋው ተናጋሪ ገና አላረጋገጠውም።',

    'shared.screen.herd': 'እንስሳት',
    'shared.screen.map': 'ካርታ',
    'shared.screen.animal': 'እንስሳ',
    'shared.screen.tag': 'መለያ',
    'shared.screen.stats': 'ስታቲስቲክስ',
    'shared.screen.data': 'ስለ መረጃው',
    'shared.screen.why': 'ለምን አስፈላጊ ነው',

    'shared.today.normalFor': 'ለ{name} መደበኛ፡ ከ{low} እስከ {high} {unit}',
    'shared.today.normalForNoUnit': 'ለ{name} መደበኛ፡ ከ{low} እስከ {high}',

    'shared.chart.now': 'አሁን',

    'shared.pose.standing': 'ቆሞ',
    'shared.pose.walking': 'እየሄደ',
    'shared.pose.trotting': 'እየሮጠ',
    'shared.pose.grazing': 'እየጋጠ',
    'shared.pose.lying': 'ተኝቶ',
    'shared.species.horse': 'ፈረስ',
    'shared.species.donkey': 'አህያ',
    'shared.species.mule': 'በቅሎ',
  },
}
