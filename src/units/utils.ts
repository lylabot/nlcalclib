import Decimal from 'decimal.js'
import {c, Conversion, NormalizedCompositeUnit, superscriptNumbers, Unit, unitsNormal} from './definitions/base'
import {unitsConversions} from './definitions/conversion'
import {unitsPreferredDisplay} from './definitions/display'
import {
  normalizedPreferredDisplayConversionsMap,
  normalizedToPreferredDisplayMap,
  simplePreferredDisplayConversionMap,
  unitToPreferredDisplayMap
} from './definitions/compositе'
import {normalizeUnit} from '../resolve'
import {findUnit} from '../tokenize/number'
import {ISO4217Currency} from './definitions/currency'
import {getExchangeRate} from '../context'

export function getPreferredDisplayOfCompounded(key: Unit): [string, Conversion] | undefined {
  for (const mapKey of normalizedToPreferredDisplayMap.keys()) {
    if (unitsAreEqual([key, mapKey])) {
      const unitDisplay = normalizedToPreferredDisplayMap.get(mapKey) as string
      return [unitDisplay, normalizedPreferredDisplayConversionsMap.get(unitDisplay) as Conversion]
    }
  }
  for (const mapKey of unitToPreferredDisplayMap.keys()) {
    if (unitsAreEqual([key, mapKey])) {
      const unitDisplay = unitToPreferredDisplayMap.get(mapKey) as string
      return [unitDisplay, simplePreferredDisplayConversionMap.get(unitDisplay) as Conversion]
    }
  }
}

export function unitsAreEqual(units: Unit[]) {
  const first = units.shift()
  if (!first) return true
  for (const unit of units) {
    if (typeof first !== typeof unit) return false
    if (Array.isArray(first) !== Array.isArray(unit)) return false
    if (typeof first === 'string') {
      if (first !== unit) return false
    } else if (Array.isArray(first)) {
      const firstSorted = first.toSorted()
      const unitSorted = (unit as string[]).toSorted()
      if (firstSorted.length !== unitSorted.length) return false
      for (let i = 0; i < firstSorted.length; i++) {
        if (firstSorted[i] !== unitSorted[i]) return
      }
    } else {
      if (
        !unitsAreEqual([first.num, (unit as NormalizedCompositeUnit).num]) ||
        !unitsAreEqual([first.den, (unit as NormalizedCompositeUnit).den])
      ) return false
    }
  }
  return true
}

export function normalizeDimension(unit: NormalizedCompositeUnit): [NormalizedCompositeUnit, Conversion] {
  let conversion = c(Decimal(1))
  for (let i = 0; i < unit.num.length; i++) {
    const [component, unitConversion] = normalizeDimensionComponent(unit.num[i])
    unit.num[i] = component
    conversion = conversion.and(unitConversion)
  }
  for (let i = 0; i < unit.den.length; i++) {
    const [component, unitConversion] = normalizeDimensionComponent(unit.den[i])
    unit.den[i] = component
    conversion = conversion.and(unitConversion.inverted)
  }
  for (let i = unit.den.length - 1; i >= 0; i--) {
    const subUnitIndexInNum = unit.num.indexOf(unit.den[i])
    if (subUnitIndexInNum !== -1) {
      unit.num.splice(subUnitIndexInNum, 1)
      unit.den.splice(i, 1)
    }
  }
  return [unit, conversion]
}

function normalizeDimensionComponent(component: string): [string, Conversion] {
  for (let code in ISO4217Currency) {
    if (code.toUpperCase() !== component.toUpperCase()) continue
    const exchangeRate = getExchangeRate()?.currentRate(component as ISO4217Currency, ISO4217Currency.USD) ?? Decimal(1)
    return [ISO4217Currency.USD, c(exchangeRate)]
  }
  for (const unitClass in unitsConversions) {
    // @ts-ignore
    if (component in unitsConversions[unitClass]) {
      return [
        // @ts-ignore
        unitsNormal[unitClass],
        // @ts-ignore
        unitsConversions[unitClass][component] as Conversion,
      ]
    }
  }
  return [component,  c(Decimal(1))]
}

export function reduceUnit(unit: NormalizedCompositeUnit): Unit | undefined {
  for (let indexNum = 0; indexNum < unit.num.length; indexNum++) {
    const subUnit = unit.num[indexNum]
    let indexDen: number
    if ((indexDen = unit.den.indexOf(subUnit)) !== -1) {
      unit.num.splice(indexNum, 1)
      unit.den.splice(indexDen, 1)
    }
  }
  for (let indexDen = 0; indexDen < unit.den.length; indexDen++) {
    const subUnit = unit.den[indexDen]
    let indexNum: number
    if ((indexNum = unit.num.indexOf(subUnit)) !== -1) {
      unit.den.splice(indexDen, 1)
      unit.num.splice(indexNum, 1)
    }
  }
  if (unit.den.length) {
    return unit
  } else if (unit.num.length /* is either non-empty array or non-empty string */) {
    if (Array.isArray(unit.num) && unit.num.length === 1) {
      return unit.num[0]
    } else {
      return unit.num
    }
  } else return undefined
}

export function formatUnit(unit: Unit, findNormalized = true): [string, Conversion] {
  let unitString: string, conversion: Conversion
  if (typeof unit === 'string' || Array.isArray(unit)) {
    [unitString, conversion] = formatHorizontalUnitList(unit)
  } else {
    let registeredCompoundUnitData = getPreferredDisplayOfCompounded(unit)
    if (!registeredCompoundUnitData && findNormalized) {
      const [dimensionallyNormalizedUnit, normalizedConversion] = normalizeDimension({
        num: [...unit.num],
        den: [...unit.den]
      })
      if (dimensionallyNormalizedUnit) {
        registeredCompoundUnitData = getPreferredDisplayOfCompounded(dimensionallyNormalizedUnit)
        conversion = normalizedConversion
      }
    }
    conversion ??= c(Decimal(1))
    if (registeredCompoundUnitData) {
      const [registeredCompoundUnitDisplay, registeredCompoundUnitConversion] = registeredCompoundUnitData
      conversion = conversion.and(registeredCompoundUnitConversion)
      unitString = registeredCompoundUnitDisplay
    } else {
      const [numUnitString, numConversion] = formatHorizontalUnitList(unit.num)
      const [denUnitString, denConversion] = formatHorizontalUnitList(unit.den)
      conversion = conversion.and(numConversion.and(denConversion.inverted))
      unitString = numUnitString + '/' + denUnitString
    }
  }
  return [unitString, conversion]
}

function formatHorizontalUnitList(units: string | string[]): [string, Conversion] {
  if (Array.isArray(units)) {
    const formatted = units.map(formatSubunit)
    // todo sort and conjoin
    const unitsAmount: Record<string, number> = {}
    let accumulatedConversion = c(Decimal(1))
    for (const [unit, conversion] of formatted) {
      unitsAmount[unit] ??= 0
      unitsAmount[unit]++
      accumulatedConversion = accumulatedConversion.and(conversion)
    }
    return [
      Object.entries(unitsAmount).map(([unit, exponent]) => {
        if (exponent < 2) return unit
        else return unit + superscriptNumbers[exponent]
      }).join('·'), // middle dot
      accumulatedConversion
    ]
  } else {
    return formatSubunit(units)
  }
}

function formatSubunit(unit: string): [string, Conversion] {
  for (const unitClass in unitsPreferredDisplay) {
    // @ts-ignore
    for (const unitName in unitsPreferredDisplay[unitClass]) {
      if (unit === unitName) {
        return [
          // @ts-ignore
          unitsPreferredDisplay[unitClass][unitName],
          // @ts-ignore
          unitsConversions[unitClass][unitName]
        ]
      }
    }
  }
  return [unit, c(Decimal(1))]
}

export function fromToUnits(value: Decimal, from: Unit, to: Unit) {
  const [fromUnit, fromConversion] = typeof from == 'string' ? findUnit(from) : [from, c(Decimal(1))]
  const [toUnit, toConversion] = typeof to == 'string' ? findUnit(to) : [to, c(Decimal(1))]
  const [fromNormalizedUnit, fromNormalizingConversion] = normalizeDimension(normalizeUnit(fromUnit))
  const [toNormalizedUnit, toNormalizingConversion] = normalizeDimension(normalizeUnit(toUnit))
  if (unitsAreEqual([fromNormalizedUnit, toNormalizedUnit])) {
    value = fromConversion.and(fromNormalizingConversion).from(value)
    // console.log(value)
    value = toConversion.and(toNormalizingConversion).to(value)
    return value
  } else {
    return false
  }
}
