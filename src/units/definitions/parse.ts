import {unitsConversions} from './conversion'
import {siL, siMultiples, siS} from './base'

const unitsLong = {
  duration: {
    ...siL('second', 'seconds?'),
    'minute': /minutes?/,
    'hour': /hours?/,
    'day': /days?/,
    'week': /weeks?/,
    'fortnight': /fortnights?/,
    'month': /months?/,
    'semester': /semesters?/,
    'year': /years?/,
    'decade': /decades?/,
    'century': /centur(?:y|ies)/,
  },
  length: {
    ...siL('meter', 'met(?:er|re)s?'),
    'angstrom': /[aå]ngstr[oö]m/,
    'furlong': /furlongs?/,
    'mile': /miles?/,
    'yard': /yards?/,
    'foot': /foot|feet/,
    'inch': /inch(es)?/,
    'fathom': /fathoms?/,
    'nautical miles': /nautical\s+miles?/,
    'light year': /light\s+years?/,
  },
  area: {
    ...siL('meter', 'met(?:er|re)s?', 'square ', 'square\\s+'),
    'square mile': /square\s+miles?/,
    'square yard': /square\s+yards?/,
    'square foot': /square\s+(?:foot|feet)/,
    'square inch': /square\s+inch(es)?/,
    'hectare': /hectares?/,
    'acre': /acres?/,
  },
  volume: {
    ...siL('liter', 'lit(?:er|re)s?'),
    ...siL('meter', 'met(?:er|re)s?', 'cubic ', 'cubic\\s+'),
    'tablespoon': /table\s*spoons?/, // metric
    'teaspoon': /tea\s*spoons?/, // metric
    'cubic mile': /cubic\s+miles?/,
    'cubic yard': /cubic\s+yards?/,
    'cubic foot': /cubic\s+(?:foot|feet)/,
    'cubic inch': /cubic\s+inch(es)?/,
    'gallon': /gallons?/,
    'quart': /quarts?/,
    'fluid ounces': /fluid\s+ounces?/,
    'US gallon': /us\s+gallons?/,
    'US quart': /us\s+quarts?/,
    'US fluid ounces': /us\s+fluid\s+ounces?/,
    'US tablespoon': /us\s+table\s*spoons?/,
    'US teaspoon': /us\s+tea\s*spoons?/,
    'cup': /cups?/, // US customary
    'pints': /gallons?/,
  },
  mass: {
    ...siL('gram', 'grams?'),
    'ton': /ton(ne)?s?/, // metric
    'ounce': /ounces?/,
    'pound': /pounds?/,
    'stone': /stones?/,
    'short ton': /short\s+tons?/,
    'carat': /carats?/,
  },
  velocity: {
    'knot': /knots?/
  },
  angle: {
    'turn': /turns?/,
    'degree': /deg(?:rees?)?/,
    'arcminute': /arc[- ]?minutes?/,
    'arcsecond': /arc[- ]?seconds?/,
    'milliarcsecond': /milli[- ]?arc[- ]?seconds?/,
    'microarcsecond': /micro[- ]?arc[- ]?seconds?/,
    'gradian': /grad(?:ians?)?|gons?|grades?/,
    'radian': /rad(?:ians?)?/,
    'milliradian': /milli[- ]?rad(?:ians?)?/,
  },
  temperature: {
    'kelvin': /kelvins?/,
    'celsius': /celsius/,
    'fahrenheit': /fahrenheit/,
  },
  current: {
    ...siL('ampere', 'ampere'),
  },
  data: {
    'bit': /bit/,
    'byte': /byte/,
    ...Object.fromEntries(siMultiples.slice(2).map((prefix) => [prefix + 'bit', prefix + 'bit'])),
    ...Object.fromEntries(siMultiples.slice(2).map((prefix) => [prefix + 'byte', prefix + 'byte'])),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix) => [prefix + 'bit', prefix + 'bit'])),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix) => [prefix + 'byte', prefix + 'byte'])),
  },
} satisfies { [T in keyof typeof unitsConversions]: { [U in keyof typeof unitsConversions[T]]: RegExp } }

for (const unitClass in unitsLong) {
  // @ts-ignore
  for (const unit in unitsLong[unitClass]) {
    // @ts-ignore
    const unitRegex = unitsLong[unitClass][unit]
    // @ts-ignore can you tell that im fed up
    unitsLong[unitClass][unit] = new RegExp(`\\b(?:${unitRegex.source})\\b`, 'i')
  }
}

export {unitsLong}

type NoShortFormUnits = 'fortnight' | 'decade' | 'century' | 'furlong' | 'cup' | 'short ton' | 'gradian' | 'radian'
const unitsShort = {
  duration: {
    ...siS('second', 's'),
    'second': /s(?:ecs?)?/,
    'minute': /mins?/,
    'hour': /h(?:rs?)?/,
    'day': /d/,
    'week': /wk/,
    'month': /mo/,
    'semester': /sem/,
    'year': /yr|a/,
  },
  length: {
    ...siS('meter', 'm'),
    'angstrom': /Å/,
    'mile': /mi/,
    'yard': /yd/,
    'foot': /ft|'|\u2032/,
    'inch': /in|"|\u2033/,
    'fathom': /fm/,
    'nautical miles': /NM|nmi/,
    'light year': /lyr?/,
  },
  area: {
    ...siS('meter', 'm2?', 'square ', '(sq(uare\\s+)?\\s*(?!\\w{1,2}m2))?'),
    'square mile': /sq(uare\s+)?\s*mi/,
    'square yard': /sq(uare\s+)?\s*yd/,
    'square foot': /sq(uare\s+)?\s*ft/,
    'square inch': /sq(uare\s+)?\s*in/,
    'hectare': /ha/,
    'acre': /ac/,
  },
  volume: {
    ...siS('liter', 'l'),
    ...siS('meter', 'm3?', 'cubic ', '(cu(bic)?\\s+(?!\\w{1,2}m3))?'),
    'tablespoon': /(?<!us )tbsp/, // metric
    'teaspoon': /(?<!us )tsp/, // metric
    'cubic mile': /cu(bic)?\s+mi/,
    'cubic yard': /cu(bic)?\s+yd/,
    'cubic foot': /cu(bic)?\s+ft/,
    'cubic inch': /cu(bic)?\s+in/,
    'gallon': /(?<!us )gal?/,
    'quart': /(?<!us )qt/,
    'fluid ounces': /(?<!us )fl\s*oz/,
    'US gallon': /us\s+gal?/,
    'US quart': /us\s+qt/,
    'US fluid ounces': /us\s+fl\s*oz?/,
    'US tablespoon': /us\s+tbsp?/,
    'US teaspoon': /us\s+tsp?/,
    'pints': /pt/,
  },
  mass: {
    ...siS('gram', 'g'),
    'ton': /t/, // metric
    'ounce': /oz/,
    'pound': /lbs/,
    'stone': /st/,
    'carat': /ct/,
  },
  velocity: {
    'knot': /kn/
  },
  angle: {
    'turn': /tr|pla|rev|cyc/,
    'degree': /°/,
    'arcminute': /′|arcmin|amin|am|MOA/,
    // n-prime is decomposed to n amount of single primes
    'arcsecond': /′{2}|arcsec|asec/,
    'milliarcsecond': /′{3}|mas/,
    'microarcsecond': /′{4}|[uµ]as/,
    'milliradian': /mrad|mil/,
  },
  temperature: {
    'kelvin': /[Kk]/,
    // the 'ºC' single character decomposes to "oC"
    'celsius': /oC|(°|deg)?[Cc]/,
    'fahrenheit': /oF|(°|deg)?[Ff]/,
  },
  current: {
    ...siL('ampere', 'A'),
  },
  data: {
    'bit': /b/,
    ...Object.fromEntries(siMultiples.slice(2).map((prefix) =>
      [prefix + 'bit', new RegExp(`[${prefix[0].toUpperCase()}${prefix[0].toLowerCase()}]b`)]
    )),
    'byte': /B/,
    ...Object.fromEntries(siMultiples.slice(2).map((prefix) =>
      [prefix + 'byte', new RegExp(`[${prefix[0].toUpperCase()}${prefix[0].toLowerCase()}]B`)]
    )),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix) =>
      [prefix + 'bit', new RegExp(`[${prefix[0].toUpperCase()}${prefix[0].toLowerCase()}]ib`)]
    )),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix, i) =>
      [prefix + 'byte', new RegExp(`[${prefix[0].toUpperCase()}${prefix[0].toLowerCase()}]iB`)]
    )),
  },
} satisfies { [T in keyof typeof unitsConversions]: { [U in Exclude<keyof typeof unitsConversions[T], NoShortFormUnits>]: RegExp } }

for (const unitClass in unitsShort) {
  // @ts-ignore
  for (const unit in unitsShort[unitClass]) {
    // @ts-ignore
    const unitRegex = unitsShort[unitClass][unit]
    // @ts-ignore can you tell that im fed up
    unitsShort[unitClass][unit] = new RegExp(`\\b(?:${unitRegex.source})\\b`)
  }
}

export {unitsShort}
