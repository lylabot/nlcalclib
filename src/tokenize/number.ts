import Decimal from 'decimal.js'
import {NumberToken, PercentageToken} from './types'
import {largeNumberSuffixes, nativeNumberWords, percentageUnit} from './base'
import {
  c,
  commonCurrencySymbolCodes,
  commonCurrencySymbols,
  Conversion,
  NormalizedCompositeUnit
} from '../units/definitions/base'
import {unitsLong, unitsShort} from '../units/definitions/parse'
import {compositeRegexToUnitMap} from '../units/definitions/compositе'
import {ISO4217Currency} from '../units/definitions/currency'

export function parseNumber(number: string, unitPrefix?: string, unit?: string, suffix?: string): NumberToken {
  // console.log(number, unitPrefix, unit, suffix)
  number = number.toLowerCase()
  const numberToken: Partial<NumberToken> = {type: 'number'}
  if (((number: string): number is typeof nativeNumberWords[number] => nativeNumberWords.includes(
    // @ts-ignore
    number
  ))(number)) {
    if (number === 'π' || number === 'pi') {
      numberToken.value = Decimal(Math.PI)
    } else if (number === 'tau') {
      numberToken.value = Decimal.mul(Math.PI, 2)
    } else if (number === 'phi') {
      numberToken.value = Decimal(5).squareRoot().add(1).div(2)
    } else {
      numberToken.value = Decimal(NaN)
    }
  } else {
    if (suffix) number = number.replace(suffix.toLowerCase(), '')
    const lastSeparatorMatch = number.match(/([.,])(\d+)$/)
    if (lastSeparatorMatch) {
      const lastSeparator = lastSeparatorMatch[1]
      const numbersBehindSeparator = lastSeparatorMatch[2]
      let decimalSeparator: string
      if (numbersBehindSeparator.length === 3) {
        decimalSeparator = '.'
      } else {
        decimalSeparator = lastSeparator
      }
      const thousandsSeparator = decimalSeparator === '.' ? ',' : '.'
      number = number.replaceAll(thousandsSeparator, '')
      if (decimalSeparator === ',') {
        number = number.replaceAll(decimalSeparator, '.')
      }
      number = number.replaceAll(/(?<!^\d+)\./g, '')
    }
    numberToken.value = Decimal(number.replaceAll(',', ''))
  }
  if (suffix && suffix in largeNumberSuffixes) {
    numberToken.value = numberToken.value.mul(largeNumberSuffixes[suffix as keyof typeof largeNumberSuffixes])
  }
  if (unit && percentageUnit.test(unit)) {
    (numberToken as PercentageToken).isPercentage = true
    numberToken.value = numberToken.value.div(100)
  } else if (unitPrefix || unit) {
    let normalizedUnit: string | NormalizedCompositeUnit = null!, conversion: Conversion = null!
    const fullUnitString = unitPrefix
      ? (unit && unit.trim().startsWith('/')
        ? unitPrefix + unit
        : unitPrefix)
      : unit as string
    ;[normalizedUnit, conversion] = findUnit(fullUnitString)
    if (normalizedUnit && conversion) {
      numberToken.unit = normalizedUnit
      numberToken.value = conversion.from(numberToken.value)
    }
  }
  return numberToken as NumberToken
}

export function findUnit(string: string): [string | NormalizedCompositeUnit, Conversion, preferredDisplay?: string] {
  const splitUnitHorizontal = string.split('/')
  if (splitUnitHorizontal.length >= 2) {
    const [strNum, cnvNum] = findUnit(splitUnitHorizontal.shift() as string)
    const num = []
    const den = []
    if (typeof strNum === 'string') num.push(strNum)
    else {
      num.push(...strNum.num)
      den.push(...strNum.den)
    }
    let cnvDen = c(Decimal(1))
    while (splitUnitHorizontal.length) {
      const [strDen, cnvSubDen] = findUnit(splitUnitHorizontal.shift() as string)
      cnvDen = cnvDen.and(cnvSubDen)
      if (typeof strDen === 'string') den.push(strDen)
      else {
        den.push(...strDen.num)
        num.push(...strDen.den)
      }
    }
    return [{num: num.filter(v => !!v), den: den.filter(v => !!v)}, cnvNum.and(cnvDen.inverted)]
  }
  const splitUnitVertical = string.split('*')
  if (splitUnitVertical.length >= 2) {
    const num = []
    const den = []
    let cnv = c(Decimal(1))
    while (splitUnitVertical.length) {
      const [str, cnvSub] = findUnit(splitUnitVertical.shift() as string)
      cnv = cnv.and(cnvSub)
      if (typeof str === 'string') num.push(str)
      else {
        num.push(...str.num)
        den.push(...str.den)
      }
    }
    return [{num: num.filter(v => !!v), den: den.filter(v => !!v)}, cnv]
  }
  const resolvedUnitName = resolveUnitName(string)
  if (resolvedUnitName !== string) {
    return [resolvedUnitName, c(Decimal(1))]
  }
  const compositeUnitMatch = compositeRegexToUnitMap.keys().find(regex => new RegExp('\\b(?:' + regex.source + ')\\b').test(string))
  if (compositeUnitMatch) {
    return compositeRegexToUnitMap.get(compositeUnitMatch) as [NormalizedCompositeUnit, Conversion, string]
  }
  return findCurrency(string) ?? [string, c(Decimal(1))]
}

function findCurrency(string: string): [string, Conversion, preferredDisplay?: string] | null {
  const currencySymbolIndex = commonCurrencySymbols.findIndex(symbol => symbol === string)
  let currency: ISO4217Currency | null = commonCurrencySymbolCodes[currencySymbolIndex]
  for (let code in ISO4217Currency) {
    if (code.toUpperCase() !== string.toUpperCase()) continue
    currency = code as ISO4217Currency
    break
  }
  if (currency) {
    return [currency, c(Decimal(1))]
  }
  return null
}

export function resolveUnitName(string: string) {
  for (const unitClass in unitsShort) {
    const unitsInClass = unitsShort[unitClass as keyof typeof unitsShort]
    for (const unit in unitsInClass) {
      const unitRegex = unitsInClass[unit as keyof typeof unitsInClass] as RegExp //?????
      if (unitRegex.exec(string)?.index === 0) return unit
    }
  }
  for (const unitClass in unitsLong) {
    const unitsInClass = unitsLong[unitClass as keyof typeof unitsLong]
    for (const unit in unitsInClass) {
      const unitRegex = unitsInClass[unit as keyof typeof unitsInClass] as RegExp
      if (unitRegex.exec(string)?.index === 0) return unit
    }
  }
  return string
}
