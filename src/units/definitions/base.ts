import Decimal from 'decimal.js'
import {ISO4217Currency} from './currency'

export type Converter = (number: Decimal) => Decimal

export interface Conversion {
  from: Converter
  to: Converter
  and: (conversion: Conversion) => Conversion
  inverted: Conversion
}

export function c(from: Decimal): Conversion
export function c(from: Converter, to: Converter): Conversion
export function c(from: Decimal | Converter, to?: Converter): Conversion {
  let fromFunc: Converter, toFunc: Converter
  if (Decimal.isDecimal(from)) {
    const conversion = from
    fromFunc = (number: Decimal) => number.mul(conversion)
    toFunc = (number: Decimal) => number.div(conversion)
  } else if (to) {
    fromFunc = from
    toFunc = to
  } else throw Error('Arguments passed to c() did not match any overload')
  return {
    from: fromFunc, to: toFunc,
    and: (conversion: Conversion) => c(
      (number) => conversion.from(fromFunc(number)),
      (number) => conversion.to(toFunc(number)),
    ),
    get inverted() {
      return c(toFunc, fromFunc)
    }
  }
}

export type NormalizedCompositeUnit = { num: string[], den: string[] }
export type CompositeUnit = string[] | { num: string | string[], den: string | string[] } | NormalizedCompositeUnit
export type Unit = string | CompositeUnit

export const commonCurrencySymbols = ['$', '¢', '£', '¤', '¥', '€', '₹', '₩']
export const commonCurrencySymbolCodes = [ISO4217Currency.USD, null, ISO4217Currency.GBP, null, ISO4217Currency.JPY, ISO4217Currency.EUR, ISO4217Currency.INR, ISO4217Currency.KRW] satisfies (ISO4217Currency | null)[]

export const siMultiples = ['deca', 'hecto', 'kilo', 'mega', 'giga', 'tera', 'peta'/*, 'exa', 'zetta', 'yotta', 'ronna', 'quetta'*/] as const
export const siMultiplesShort = ['da', 'h', 'k', 'M', 'G', 'T', 'P'/*, 'E', 'Z', 'Y', 'R', 'Q'*/] as const
export const siMultiplesDisplay = siMultiplesShort
export const siMultiplesExponents = [1, 2, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30]

export const siSubmultiples = ['deci', 'centi', 'milli', 'micro', 'nano', 'pico', 'femto'/*, 'atto', 'zepto', 'yocto', 'ronto', 'quecto'*/] as const
export const siSubmultiplesShort = ['d', 'c', 'm', '[µu]', 'n', 'p', 'f'/*, 'a', 'z', 'y', 'r', 'q'*/] as const
export const siSubmultiplesDisplay = ['d', 'c', 'm', 'µ', 'n', 'p', 'f'/*, 'a', 'z', 'y', 'r', 'q'*/] as const
export const siSubmultiplesExponents = siMultiplesExponents.map(n => n * -1)

export const siBase = <N extends string, V extends any, P extends string = '', >(
  name: N, prefix: P, baseValue: V, multiplesValue: (index: number) => V, submultiplesValue: (index: number) => V
) => {
  type Key = `${P}${typeof siMultiples[number]}${N}` | `${P}${typeof siSubmultiples[number]}${N}` | `${P}${N}`
  const u: Partial<Record<Key, V>> = {}
  u[prefix + name as Key] = baseValue
  for (let i = 0; i < siMultiples.length; i++) u[(prefix + siMultiples[i] + name) as Key] = multiplesValue(i)
  for (let i = 0; i < siSubmultiples.length; i++) u[(prefix + siSubmultiples[i] + name) as Key] = submultiplesValue(i)
  return u as Record<Key, V>
}
export const siRegexBase = <N extends string, NP extends string = ''>(name: N, base: string, namePrefix: NP, prefix: string, multiples: readonly string[], submultiples: readonly string[]) => {
  return siBase(name, namePrefix,
    new RegExp(`${prefix}${base}`, 'i'),
    (i) => new RegExp(`${prefix}${multiples[i]}${base}`, 'i'),
    (i) => new RegExp(`${prefix}${submultiples[i]}${base}`, 'i'),
  )
}
export const siL = <N extends string, NP extends string = ''>(
  name: N, base: string, namePrefix?: NP, prefix: string = ''
) => siRegexBase(name, base, namePrefix ?? '', prefix, siMultiples, siSubmultiples)
export const siS = <N extends string, NP extends string = ''>(
  name: N, short: string, namePrefix?: NP, prefix: string = ''
) => siRegexBase(name, short, namePrefix ?? '', prefix, siMultiplesShort, siSubmultiplesShort)
export const siD = <N extends string, NP extends string = ''>(
  name: N, base: string, namePrefix?: NP, prefix: string = ''
) => siBase(name, namePrefix ?? '', prefix + base,
  (i) => prefix + siMultiplesDisplay[i] + base,
  (i) => prefix + siSubmultiplesDisplay[i] + base,
)
export const siC = <N extends string, NP extends string = ''>(name: N, namePrefix?: NP, mapper?: (value: Decimal) => Decimal) => {
  const multipliers = siBase(name, namePrefix ?? '', Decimal(1),
    (i) => Decimal.pow(10, siMultiplesExponents[i]),
    (i) => Decimal.pow(10, siSubmultiplesExponents[i]),
  )
  const conversions = {} as Record<keyof typeof multipliers, Conversion>
  for (let key_ in multipliers) {
    const key = key_ as keyof typeof multipliers
    let multiplier = multipliers[key]
    if (mapper) multiplier = mapper(multiplier)
    conversions[key] = c(multiplier)
  }
  return conversions
}

/* todo frequency, energy, power */
export type UnitCategories = 'duration' | 'length' | 'area' | 'volume' | 'mass' | 'velocity' | 'angle' | 'temperature' /*| 'frequency' | 'energy' | 'power'*/

export const unitsNormal = {
  duration: 'second',
  length: 'meter',
  area: 'square meter',
  volume: 'cubic meter',
  mass: 'gram',
  velocity: '',
  angle: 'degree',
  temperature: 'celsius',
} satisfies { [T in UnitCategories]: string }
export const unitsOrder: UnitCategories[] = ['length', 'mass', 'duration']
export const superscriptNumbers = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'] //⅕
