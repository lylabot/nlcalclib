import {siD, siMultiples, superscriptNumbers} from './base'
import {unitsConversions} from './conversion'

const unitsPreferredDisplay = {
  duration: {
    ...siD('second', 's'),
    'minute': 'min',
    'hour': 'h',
    'day': 'd',
    'week': 'wk',
    'fortnight': ['fortnight', 'fortnights'],
    'month': 'mo',
    'semester': 'sem',
    'year': 'yr',
    'decade': ['decade', 'decades'],
    'century': ['century', 'centuries'],
  },
  length: {
    ...siD('meter', 'm'),
    'angstrom': 'angstrom',
    'furlong': ['furlong', 'furlongs'],
    'mile': 'mi',
    'yard': 'yd',
    'foot': '\u2032',
    'inch': '\u2033',
    'fathom': 'fm',
    'nautical miles': 'NM',
    'light year': 'ly',
  },
  area: {
    ...siD('meter', 'm' + superscriptNumbers[2], 'square '),
    'square mile': 'sqmi',
    'square yard': 'sqyd',
    'square foot': 'sqft',
    'square inch': 'sqin',
    'hectare': 'ha',
    'acre': 'ac',
  },
  volume: {
    ...siD('liter', 'l'),
    ...siD('meter', 'm' + superscriptNumbers[3], 'cubic '),
    'tablespoon': 'tbsp (metric)', // metric
    'teaspoon': 'tsp (metric)', // metric
    'cubic mile': 'mi' + superscriptNumbers[3],
    'cubic yard': 'yd' + superscriptNumbers[3],
    'cubic foot': 'ft' + superscriptNumbers[3],
    'cubic inch': 'in' + superscriptNumbers[3],
    'gallon': 'imp gal',
    'quart': 'imp qt',
    'fluid ounces': 'imp floz',
    'US gallon': 'US gal',
    'US quart': 'US gal',
    'US fluid ounces': 'US floz',
    'US tablespoon': 'US tbsp',
    'US teaspoon': 'US tsp',
    'cup': ['cup', 'cups'], // US customary
    'pints': 'pt',
  },
  mass: {
    ...siD('gram', 'g'),
    'ton': 't', // metric
    'ounce': 'oz',
    'pound': 'lbs',
    'stone': 'st',
    'short ton': ['short ton', 'short tons'],
    'carat': 'ct',
  },
  velocity: {
    'knot': 'kn'
  },
  angle: {
    'turn': 'tr',
    'degree': '°',
    'arcminute': '′',
    'arcsecond': '″',
    'milliarcsecond': '‴',
    'microarcsecond': '⁗',
    'gradian': 'ᵍ',
    'radian': 'rad',
    'milliradian': 'mrad',
  },
  temperature: {
    'kelvin': 'K',
    'celsius': '°C',
    'fahrenheit': '°F',
  },
  current: {
    ...siD('ampere', 'A'),
  },
  data: {
    'bit': 'bit',
    'byte': 'B',
    ...Object.fromEntries(siMultiples.slice(2).map((prefix) =>
      [prefix + 'bit', `${prefix[0].toUpperCase()}b`]
    )),
    ...Object.fromEntries(siMultiples.slice(2).map((prefix) =>
      [prefix + 'byte', `${prefix[0].toUpperCase()}B`]
    )),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix) =>
      [prefix + 'bit', `${prefix[0].toUpperCase()}ib`]
    )),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix, i) =>
      [prefix + 'byte', `${prefix[0].toUpperCase()}iB`]
    )),
  },
} satisfies { [T in keyof typeof unitsConversions]: { [U in keyof typeof unitsConversions[T]]: string | [string, string] } }

export {unitsPreferredDisplay}
