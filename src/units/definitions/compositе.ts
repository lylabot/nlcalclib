import {getPreferredDisplayOfCompounded, normalizeDimension} from '../utils'
import {
  c,
  Conversion,
  NormalizedCompositeUnit,
  siMultiples,
  siMultiplesDisplay,
  siMultiplesExponents,
  siMultiplesShort, siSubmultiples, siSubmultiplesDisplay, siSubmultiplesExponents, siSubmultiplesShort
} from './base'
import Decimal from 'decimal.js'

const normalizedToPreferredDisplayMap = new Map<NormalizedCompositeUnit, string>
const unitToPreferredDisplayMap = new Map<NormalizedCompositeUnit, string>
const normalizedPreferredDisplayConversionsMap = new Map<string, Conversion>
const simplePreferredDisplayConversionMap = new Map<string, Conversion>
const compositeRegexToUnitMap = new Map<RegExp, [NormalizedCompositeUnit, Conversion, string]>
const originalCompositeRegexToUnitMapGet = compositeRegexToUnitMap.get
compositeRegexToUnitMap.get = (key: RegExp) => {
  const res = originalCompositeRegexToUnitMapGet.call(compositeRegexToUnitMap, key)
  if (res) return [{num: [...res[0].num], den: [...res[0].den]}, res[1], res[2]]
}

function registerCompositeUnit(preferredDisplay: string, regex: RegExp, baseUnits: NormalizedCompositeUnit, withConversion?: Conversion) {
  compositeRegexToUnitMap.set(regex, [baseUnits, withConversion ?? c(Decimal(1)), preferredDisplay])

  let [unitNormalizedDimensions, conversion] = normalizeDimension({num: [...baseUnits.num], den: [...baseUnits.den]})
  conversion = conversion.inverted
  if (withConversion) conversion = conversion.and(withConversion)

  if (!normalizedToPreferredDisplayMap.has(unitNormalizedDimensions)) {
    normalizedToPreferredDisplayMap.set(unitNormalizedDimensions, preferredDisplay)
  }
  normalizedPreferredDisplayConversionsMap.set(preferredDisplay, conversion)
  if (!unitToPreferredDisplayMap.has(baseUnits)) {
    unitToPreferredDisplayMap.set(baseUnits, preferredDisplay) // this needs a different conversion
  }
  simplePreferredDisplayConversionMap.set(preferredDisplay, withConversion ?? c(Decimal(1)))
}

function registerCompositeUnitWithPrefixes(preferredDisplay: string, regex: RegExp, baseUnits: NormalizedCompositeUnit, prefixData: [prefix: string, prefixRegex: RegExp, conversion: Conversion][]) {
  registerCompositeUnit(preferredDisplay, regex, baseUnits)
  for (let [prefix, prefixRegex, conversion] of prefixData) {
    const splitPrefixRegex = prefixRegex.source.split('|')
    registerCompositeUnit(
      prefix + preferredDisplay,
      // todo this splitting is not top-level only
      new RegExp(regex.source.split('|').map((regexSource, i) => splitPrefixRegex[i] + regexSource).join('|')),
      baseUnits, conversion
    )
  }
}

const siP = () =>
  siMultiples.map((prefix, index): [prefix: string, prefixRegex: RegExp, conversion: Conversion] => [
    siMultiplesDisplay[index],
    new RegExp(`${siMultiplesShort[index]}|[${prefix[0]}${prefix[0].toUpperCase()}]${prefix.substring(1)}`),
    c(Decimal.pow(10, siMultiplesExponents[index]))
  ]).concat(siSubmultiples.map((prefix, index) => [
    siSubmultiplesDisplay[index],
    new RegExp(`${siSubmultiplesShort[index]}|[${prefix[0]}${prefix[0].toUpperCase()}]${prefix.substring(1)}`),
    c(Decimal.pow(10, siSubmultiplesExponents[index]))
  ]))

// register for normalized components FIRST, e.g. m/s before km/h or mph
// SPEED / VELOCITY
registerCompositeUnit('m/s', /m\/s|met(?:er|re)s?(?:\s+per\s+|\s*\/\s*)sec(ond)?/, {num: ['meter'], den: ['second']})
registerCompositeUnit('km/h', /km[\/p]?h|kph|kilomet(?:er|re)s?(?:\s+per\s+|\s*\/\s*)hour/, {
  num: ['kilometer'],
  den: ['hour']
})
registerCompositeUnit('mph', /mph|mi\/h|miles?(?:\s+per\s+|\s*\/\s*)hour/, {num: ['mile'], den: ['hour']})

// PRESSURE
registerCompositeUnitWithPrefixes('Pa', /Pa|[Pp]ascals?/, {
  num: ['kilogram'],
  den: ['meter', 'second', 'second']
}, siP())
registerCompositeUnitWithPrefixes('bar', /[Bb]ars?/, {num: ['gigagram'], den: ['meter', 'second', 'second']}, siP())
registerCompositeUnit('atm', /atm(ospheres?)?/, {
  num: ['kilogram'],
  den: ['meter', 'second', 'second']
}, c(Decimal(101_325)))
const gravitationalForce = 9.80665
registerCompositeUnit('psi', /psi|pounds[\s-]force\sper\ssquare[\s-]inch/, {
  num: ['pound', 'meter'],
  den: ['inch', 'inch', 'second', 'second']
}, c(Decimal(gravitationalForce)))

// FORCE
registerCompositeUnitWithPrefixes('N', /N|[Nn]ewtons?/, {num: ['kilogram', 'meter'], den: ['second', 'second']}, siP())
registerCompositeUnit('lbf', /lbf|pounds[\s-]force/, {
  num: ['pound', 'meter'],
  den: ['second', 'second']
}, c(Decimal(gravitationalForce)))

// ENERGY
registerCompositeUnitWithPrefixes('Wh', /[Ww]h|[Ww]att[\s-]?hours?/, {
  num: ['kilogram', 'meter', 'meter', 'hour'],
  den: ['second', 'second', 'second']
}, siP())
registerCompositeUnit('Wm', /[Ww]m|[Ww]att[\s-]?minutes?/, {
  num: ['kilogram', 'meter', 'meter', 'minute'],
  den: ['second', 'second', 'second']
})
registerCompositeUnit('Ws', /[Ww]s|[Ww]att[\s-]?seconds?/, {
  num: ['kilogram', 'meter', 'meter', 'second'],
  den: ['second', 'second', 'second']
})
registerCompositeUnitWithPrefixes('J', /J|[Jj]oules?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second']
}, siP())
registerCompositeUnit('cal', /cal(ories?)?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second']
}, c(Decimal(4.184)))
registerCompositeUnit('kcal', /kilocal(ories?)?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second']
}, c(Decimal(4184)))

// POWER
registerCompositeUnitWithPrefixes('W', /W|[Ww]atts?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second', 'second']
}, siP())
registerCompositeUnit('hp', /hp|[Hh]orse[\s-]power/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second', 'second']
}, c(Decimal(746)))

// FREQUENCY
registerCompositeUnitWithPrefixes('Hz', /Hz|[Hh]ertz/, {num: [], den: ['second']}, siP())
// todo musical pitches
registerCompositeUnit('bpm', /bpm|beats?(?:\s+(?:per|a)\s+|\s*\/\s*)minute/, {num: [], den: ['minute']})

// ELECTRICAL POTENTIAL
registerCompositeUnitWithPrefixes('V', /V(olts?)?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second', 'second', 'ampere']
}, siP())

// ELECTRICAL RESISTANCE
registerCompositeUnitWithPrefixes('Ω', /Ω|Ohms?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second', 'second', 'ampere', 'ampere']
}, siP())

// ELECTRICAL CHARGE
registerCompositeUnitWithPrefixes('Ah', /[Aa]h|[Aa]att[\s-]?hours?/, {num: ['ampere', 'hour'], den: []}, siP())
registerCompositeUnit('C', /[Cc](oulombs?)?/, {num: ['ampere', 'second'], den: []})

// ELECTRICAL CAPACITANCE
registerCompositeUnitWithPrefixes('F', /[Ff](arads?)?/, {
  num: ['second', 'second', 'second', 'second', 'ampere', 'ampere'],
  den: ['kilogram', 'meter', 'meter'],
}, siP())

// ELECTRICAL INDUCTANCE
registerCompositeUnitWithPrefixes('H', /[Hh](enrys?)?/, {
  num: ['kilogram', 'meter', 'meter'],
  den: ['second', 'second', 'ampere', 'ampere'],
}, siP())

// ELECTRICAL CONDUCTANCE
registerCompositeUnitWithPrefixes('S', /℧[Ss]|[Ss]iemens/, {
  num: ['second', 'second', 'second', 'ampere', 'ampere'],
  den: ['kilogram', 'meter', 'meter'],
}, siP())

export {
  compositeRegexToUnitMap,
  normalizedToPreferredDisplayMap,
  unitToPreferredDisplayMap,
  normalizedPreferredDisplayConversionsMap,
  simplePreferredDisplayConversionMap
}
