import Decimal from 'decimal.js'
import {combinations, gamma, permutations} from 'mathjs'
import nerdamer from 'nerdamer'
import 'nerdamer/Solve.js'

import {isWhatPercentage, stringifyToken} from './stringify-token'
import {Conversion, NormalizedCompositeUnit, Unit} from './units/definitions/base'
import {normalizeDimension, reduceUnit, unitsAreEqual} from './units/utils'
import {
  DateTimeToken,
  MultiUnitToken,
  NormalizedToken,
  NumberToken,
  NumericToken,
  Operator,
  OperatorToken,
  PercentageToken,
  PureOrNormalNumberToken,
  TimeAccuracy,
  Token
} from './tokenize/types'
import {resolveUnitName} from './tokenize/number'
import {unitsConversions} from './units/definitions/conversion'

const numUnitPartRegex = /^([^^]+)(?:\^(\d+))?$/
const denUnitPartRegex = /^([^^]+)\^\(-(\d+)\)$/

export function resolve(token: Token): NumberToken | NormalizedToken | DateTimeToken | null {
  if (!token) return null
  if (token.type === 'number') return normalizeDimensional(token) as PureOrNormalNumberToken
  else if (token.type === 'datetime') return token
  // else if (token.type === 'interval') return token
  else if (token.type === 'operator') return resolveOperator(token)
  else if (token.type === 'equation') {
    // console.log(`${stringifyToken(token.left)}=${stringifyToken(token.right)}`)
    const vector = nerdamer(`solve(${stringifyToken(token.left)}=${stringifyToken(token.right)},x)`)
    const vectorText = vector.text()
    const solves = vectorText.substring(1, vectorText.length - 1).split(',') as string[]
    const [solveNumberString, ...solveUnitParts] = solves[0].split('*')
    const [unit, conversion] = normalizeDimension({
      num: solveUnitParts.map(part => {
        const match = part.match(numUnitPartRegex)
        if (!match) return null
        return Array(Number(match[2] ?? 1)).fill(0).map(() => resolveUnitName(match[1]))
      }).flat().filter(v => v !== null),
      den: solveUnitParts.map(part => {
        const match = part.match(denUnitPartRegex)
        if (!match) return null
        return Array(Number(match[2])).fill(0).map(() => resolveUnitName(match[1]))
      }).flat().filter(v => v !== null)
    })
    const numberToken = {type: 'number', value: conversion.from(Decimal(solveNumberString)), unit: reduceUnit(unit)}
    if (isWhatPercentage(token.left) ?? isWhatPercentage(token.right)) {
      numberToken.value = numberToken.value.div(100);
      (numberToken as PercentageToken).isPercentage = true
    }
    return numberToken as NumberToken
  } else return null
}

function resolveOperator(token: OperatorToken): NumericToken | DateTimeToken {
  if (token.arguments.some(argument => argument?.type === 'datetime' || argument?.type === 'interval') || token.value === Operator.CalendarWeek) {
    return resolveOperatorAsDate(token)
  }
  const tokens = token.arguments.map(resolve) as (NumberToken | NormalizedToken | null)[]
  const numbers = tokens
    .map(token => token?.value) as Decimal[]
  // split up area and volume to lengths
  let value: Decimal = null!,
    unit: Unit | undefined = unitIfCompatible(tokens.map(t => t?.unit ?? null)),
    originalUnit: Unit | undefined = unitIfCompatible(tokens.map(t => (t as NormalizedToken | null)?.originalUnit ?? null)),
    isPercentage = false
  if (token.value === Operator.Sum) {
    if (numbers.length === 2 && !(tokens[0] as PercentageToken)?.isPercentage && (tokens[1] as PercentageToken)?.isPercentage) {
      value = Decimal.add(numbers[0] ?? 0, Decimal.mul(numbers[0] ?? 0, numbers[1] ?? 1))
    } else {
      value = Decimal.sum(...numbers.filter(n => n != null))
    }
    if (tokens.every(token => !token?.unit) && (tokens[0] as PercentageToken | null)?.isPercentage) {
      isPercentage = true
    }
  } else if (token.value === Operator.Subtract) {
    if (numbers.length === 2 && !(tokens[0] as PercentageToken)?.isPercentage && (tokens[1] as PercentageToken)?.isPercentage) {
      value = Decimal.sub(numbers[0] ?? 0, Decimal.mul(numbers[0] ?? 0, numbers[1] ?? 1))
    } else {
      value = Decimal.sub(numbers[0] ?? 0, numbers[1] ?? 0)
    }
    if (tokens.every(token => !token?.unit) && (tokens[0] as PercentageToken | null)?.isPercentage) {
      isPercentage = true
    }
  } else if (token.value === Operator.Multiply) {
    const unit0 = normalizeUnit(tokens[0]?.unit)
    const unit1 = normalizeUnit(tokens[1]?.unit)
    unit = reduceUnit({num: [...unit0.num, ...unit1.num], den: [...unit0.den, ...unit1.den]})
    const originalUnit0 = normalizeUnit((tokens[0] as NormalizedToken | null)?.originalUnit)
    const originalUnit1 = normalizeUnit((tokens[1] as NormalizedToken | null)?.originalUnit)
    originalUnit = reduceUnit({
      num: [...originalUnit0.num, ...originalUnit1.num],
      den: [...originalUnit0.den, ...originalUnit1.den]
    })
    value = numbers.reduce((acc, token) => acc.mul(token ?? 1), Decimal(1))
  } else if (token.value === Operator.Divide) {
    value = Decimal.div(numbers[0] ?? 1, numbers[1] ?? 1)
    const unit0 = normalizeUnit(tokens[0]?.unit)
    const unit1 = normalizeUnit(tokens[1]?.unit)
    unit = reduceUnit({num: [...unit0.num, ...unit1.den], den: [...unit0.den, ...unit1.num]})
    const originalUnit0 = normalizeUnit((tokens[0] as NormalizedToken | null)?.originalUnit)
    const originalUnit1 = normalizeUnit((tokens[1] as NormalizedToken | null)?.originalUnit)
    originalUnit = reduceUnit({
      num: [...originalUnit0.num, ...originalUnit1.den],
      den: [...originalUnit0.den, ...originalUnit1.num]
    })
  } else if (token.value === Operator.Power) {
    const unit0 = normalizeUnit(tokens[0]?.unit)
    unit = reduceUnit({num: [...unit0.num, ...unit0.num], den: [...unit0.den, ...unit0.den]})
    const originalUnit0 = normalizeUnit((tokens[0] as NormalizedToken | null)?.originalUnit)
    originalUnit = reduceUnit({
      num: [...originalUnit0.num, ...originalUnit0.num],
      den: [...originalUnit0.den, ...originalUnit0.den]
    })
    value = Decimal.pow(numbers[0], numbers[1])
  } else if (token.value === Operator.Modulo) {
    unit = tokens[0]?.unit
    originalUnit = (tokens[0] as NormalizedToken | null)?.originalUnit
    value = Decimal.mod(numbers[0], numbers[1])
  } else if (token.value === Operator.Factorial) {
    value = gamma(Decimal.add(numbers[0], 1))
    unit = undefined
  } else if (token.value === Operator.Absolute) {
    unit = tokens[0]?.unit
    value = numbers[0].abs()
  } else if (token.value === Operator.Round || token.value === Operator.Floor || token.value === Operator.Ceil) {
    if (!numbers[1]) {
      if (numbers[2]) {
        numbers[1] = Decimal.pow(10, Decimal.mul(-1, numbers[2]))
      } else {
        numbers[1] = Decimal(1)
      }
    }
    const nearest = Decimal(numbers[1])
    const normal = Decimal.div(numbers[0], nearest)
    let rounded: Decimal = null!
    if (token.value === Operator.Round) rounded = normal.round()
    else if (token.value === Operator.Floor) rounded = normal.floor()
    else if (token.value === Operator.Ceil) rounded = normal.ceil()
    value = rounded.mul(nearest)
    unit = tokens[0]?.unit
    originalUnit = (tokens[0] as NormalizedToken | null)?.originalUnit
  } else if (token.value === Operator.Average) {
    value = Decimal.sum(...numbers.filter(n => n !== undefined)).div(numbers.filter(n => n !== undefined).length)
  } else if (token.value === Operator.Median) {
    const sorted = numbers.filter(n => n !== undefined).sort()
    const center = (sorted.length - 1) / 2
    if (center % 1) {
      value = Decimal.sum(sorted[center - .5], sorted[center + .5]).div(2)
    } else {
      value = Decimal(sorted[center])
    }
  } else if (token.value === Operator.Count) {
    value = Decimal(numbers.filter(n => n !== undefined).length)
    unit = undefined
  } else if (token.value === Operator.Root) {
    token.arguments[0] ??= {type: 'complimentary', value: 'square'}
    // todo units MUST be numbers[0]th (or multiple) power or be undefined
    if (token.arguments[0].type === 'complimentary') {
      if (token.arguments[0].value === 'square') {
        numbers[0] = Decimal(2)
      } else if (token.arguments[0].value === 'cube') {
        numbers[0] = Decimal(3)
      }
    }
    value = Decimal.pow(numbers[1], Decimal.div(1, numbers[0] ?? 1))
  } else if (token.value === Operator.Logarithm) {
    unit = undefined
    value = Decimal.log(numbers[0], numbers[1])
  } else if (token.value === Operator.Min) {
    value = Decimal.min(...numbers.filter(n => n != null))
  } else if (token.value === Operator.Max) {
    value = Decimal.max(...numbers.filter(n => n != null))
  } else if (token.value === Operator.Mid) {
    if (typeof numbers[0] === 'number' && numbers[1] == null) {
      numbers[1] = numbers[0]
      numbers[0] = Decimal(0)
    }
    numbers[0] ??= Decimal(0)
    if (numbers[1] == null) value = Decimal(numbers[0])
    else value = Decimal.sum(numbers[0], numbers[1]).div(2)
  } else if (token.value === Operator.Random) {
    // todo units MUST equal exactly or be undefined
    orderTwo(numbers as [Decimal, Decimal])
    value = Decimal.random().mul(Decimal.sub(numbers[1], numbers[0])).add(numbers[0])
  } else if (token.value === Operator.GCD) {
    value = euclideanGCD(numbers as [Decimal, Decimal])
  } else if (token.value === Operator.LCM) {
    const gcd = euclideanGCD([...numbers] as [Decimal, Decimal])
    value = Decimal.div(Decimal.abs(numbers[0]), gcd).mul(Decimal.abs(numbers[1]))
  } else if (token.value === Operator.Permutation) {
    value = permutations(Decimal(numbers[0]), Decimal(numbers[1]))
  } else if (token.value === Operator.Combination) {
    value = combinations(Decimal(numbers[0]), Decimal(numbers[1]))
  } else if (token.value === Operator.Clamp) {
    // todo units MUST equal exactly or be undefined
    value = Decimal.clamp(numbers[0], ...orderTwo([Decimal(numbers[1] ?? -Infinity), Decimal(numbers[2] ?? Infinity)]))
  }
  if (value.isNaN()) {
    throw new Error('Resolving failed successfully')
  }
  return {
    type: 'number',
    value: value,
    unit,
    // @ts-ignore
    originalUnit,
    isPercentage
  }
}

const temporalDurationLikeCompatibleUnits = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond']satisfies (keyof typeof unitsConversions.duration)[]
type TemporalDurationLikeIncompatibleKeys = Exclude<keyof typeof unitsConversions.duration, typeof temporalDurationLikeCompatibleUnits[number]>
const temporalDurationLikeUnitMapping = {
  decasecond: 'second',
  hectosecond: 'second',
  kilosecond: 'second',
  megasecond: 'second',
  gigasecond: 'second',
  terasecond: 'second',
  petasecond: 'second',
  decisecond: 'second',
  centisecond: 'second',
  microsecond: 'second',
  nanosecond: 'second',
  picosecond: 'second',
  femtosecond: 'second',
  fortnight: 'week',
  semester: 'year',
  decade: 'year',
  century: 'year'
} satisfies { [K in TemporalDurationLikeIncompatibleKeys]: keyof typeof unitsConversions.duration }

const timeAccuracyUnitEquivalents = {
  [TimeAccuracy.NoTime]: 'day',
  [TimeAccuracy.Hour]: 'hour',
  [TimeAccuracy.Minute]: 'minute',
  [TimeAccuracy.Second]: 'second',
  [TimeAccuracy.Millisecond]: 'millisecond'
}  satisfies { [K in TimeAccuracy]: keyof typeof unitsConversions.duration }
const unitsTimeAccuracy =
  Object.fromEntries(Object.entries(timeAccuracyUnitEquivalents).map(([k, v]) => [v, Number(k)])) as unknown as { [K in typeof timeAccuracyUnitEquivalents[keyof typeof timeAccuracyUnitEquivalents]]: TimeAccuracy }

function resolveOperatorAsDate(token: OperatorToken): DateTimeToken | NumericToken {
  const tokens = token.arguments.map(resolve).map(arg => {
    if (!arg) return arg
    else if (arg.type === 'number') {
      if (arg.unit && arg.unit !== 'second') {
        throw new Error('Incompatible units')
      }
      if ('originalUnit' in arg &&
        // @ts-ignore
        unitsConversions.duration[arg.originalUnit]) {
        const targetUnit = typeof arg.originalUnit === 'string' && arg.originalUnit in temporalDurationLikeUnitMapping
          ? temporalDurationLikeUnitMapping[arg.originalUnit as keyof typeof temporalDurationLikeUnitMapping]
          : arg.originalUnit
        // @ts-ignore
        const conversion = unitsConversions.duration[targetUnit] as Conversion
        arg.value = conversion.to(arg.value)
        arg.unit = targetUnit

        if ('numbers' in arg) {
          for (let token of (arg as MultiUnitToken).numbers) {
            if (typeof token.unit !== 'string' || !(token.unit in temporalDurationLikeUnitMapping)) continue
            const targetUnit = temporalDurationLikeUnitMapping[token.unit as keyof typeof temporalDurationLikeUnitMapping]
            // @ts-ignore
            const conversion = unitsConversions.duration[targetUnit] as Conversion
            token.value = conversion.to(token.value)
            token.unit = targetUnit
          }
        }
      }
      return arg
    } else if (arg.type === 'datetime' && (token.value === Operator.Sum || token.value === Operator.Subtract)) return arg
    else return null
  }) as (NumberToken | NormalizedToken | DateTimeToken | null)[]
  const dateTimeToken = tokens.find(token => token?.type === 'datetime')
  const durationToken = tokens.find(token => token?.type === 'number')

  let value: Decimal = null!
  let timeAccuracy = dateTimeToken?.timeAccuracy ?? TimeAccuracy.NoTime
  if (token.value === Operator.Sum) {
    if (!dateTimeToken) {
      throw new Error('Generic error')
    }
    if (tokens.some(token => (token as PercentageToken).isPercentage)) {
      throw new Error('Cannot use percentage here')
    } else {
      if (!durationToken) {
        throw new Error('Generic error')
      }
      if ('numbers' in durationToken) {
        const durationLike: Temporal.DurationLikeObject = {}
        if ((durationToken as MultiUnitToken).numbers.every(number => number.value.isInt())) {
          for (let durationPartToken of (durationToken as MultiUnitToken).numbers) {
            if (typeof durationPartToken.unit !== 'string') continue
            durationLike[durationPartToken.unit + 's' as keyof Temporal.DurationLikeObject] = durationPartToken.value.toNumber()
            if (durationPartToken.unit in unitsTimeAccuracy &&
              (unitsConversions.duration[durationPartToken.unit as keyof typeof unitsConversions.duration] as Conversion)
                .and(unitsConversions.duration[timeAccuracyUnitEquivalents[timeAccuracy] as keyof typeof unitsConversions.duration].inverted)
                .from(Decimal(1)).lt(1)
            ) {
              timeAccuracy = unitsTimeAccuracy[durationPartToken.unit as keyof typeof unitsTimeAccuracy]
            }
          }
        } else {
          durationLike.seconds = durationToken.value.toNumber()
        }
        value = Decimal(
          new Temporal.ZonedDateTime(BigInt(dateTimeToken.utcValue.value.mul(1e6).toFixed(0)), 'UTC')
            .add(Temporal.Duration.from(durationLike))
            .epochMilliseconds
        )
      } else {
        value = Decimal(
          new Temporal.ZonedDateTime(BigInt(dateTimeToken.utcValue.value.mul(1e6).toFixed(0)), 'UTC')
            .add({[durationToken.unit + 's']: durationToken.value.toNumber()})
            .epochMilliseconds
        )
      }
    }
  } else if (token.value === Operator.Subtract) {
    if (!dateTimeToken) {
      throw new Error('Generic error')
    }
    if (tokens.some(token => (token as PercentageToken).isPercentage)) {
      throw new Error('Cannot use percentage here')
    } else {
      if (!durationToken) {
        const duration = new Temporal.ZonedDateTime(BigInt((tokens[0] as DateTimeToken).utcValue.value.mul(1e6).toFixed(0)), 'UTC')
          .since(new Temporal.ZonedDateTime(BigInt((tokens[1] as DateTimeToken).utcValue.value.mul(1e6).toFixed(0)), 'UTC'))
        return {
          type: 'number',
          value: Decimal(duration.total('second')).round(),
          unit: 'second',
          originalUnit: 'day',
        }
      } else {
        if ('numbers' in durationToken) {
          const durationLike: Temporal.DurationLikeObject = {}
          if ((durationToken as MultiUnitToken).numbers.every(number => number.value.isInt())) {
            for (let durationPartToken of (durationToken as MultiUnitToken).numbers) {
              if (typeof durationPartToken.unit !== 'string') continue
              durationLike[durationPartToken.unit + 's' as keyof Temporal.DurationLikeObject] = durationPartToken.value.mul(-1).toNumber()
              if (durationPartToken.unit in unitsTimeAccuracy &&
                (unitsConversions.duration[durationPartToken.unit as keyof typeof unitsConversions.duration] as Conversion)
                  .and(unitsConversions.duration[timeAccuracyUnitEquivalents[timeAccuracy] as keyof typeof unitsConversions.duration].inverted)
                  .from(Decimal(1)).lt(1)
              ) {
                timeAccuracy = unitsTimeAccuracy[durationPartToken.unit as keyof typeof unitsTimeAccuracy]
              }
            }
          } else {
            durationLike.seconds = durationToken.value.mul(-1).toNumber()
          }
          value = Decimal(
            new Temporal.ZonedDateTime(BigInt(dateTimeToken.utcValue.value.mul(1e6).toFixed(0)), 'UTC')
              .add(durationLike)
              .epochMilliseconds
          )
        } else {
          value = Decimal(
            new Temporal.ZonedDateTime(BigInt(dateTimeToken.utcValue.value.mul(1e6).toFixed(0)), 'UTC')
              .add({[durationToken.unit + 's']: durationToken.value.mul(-1).toNumber()})
              .epochMilliseconds
          )
        }
      }
    }
  } else if (token.value === Operator.CalendarWeek) {
    const date = token.arguments[0]?.type === 'datetime'
      ? new Temporal.ZonedDateTime(BigInt(token.arguments[0].utcValue.value.mul(1e6).toFixed(0)), 'UTC')
      : Temporal.Now.zonedDateTimeISO('UTC')
    return {
      type: 'number',
      value: Decimal(date.weekOfYear as number)
    }
  } else {
    throw new Error('Unsupported operation for temporal value')
  }
  return {
    type: 'datetime',
    utcValue: {type: 'number', value},
    offset: dateTimeToken?.offset ?? Decimal(0),
    hasYear: dateTimeToken?.hasYear ?? false,
    timeAccuracy,
  }
}

function unitIfCompatible(units: (Unit | null)[]): Unit | undefined {
  if (unitsAreEqual(units.filter(u => u !== null && u !== undefined)))
    return units.find(t => !!t) ?? undefined
}

function normalizeDimensional(numberToken: NumberToken): PureOrNormalNumberToken {
  if (!numberToken.unit) return numberToken
  const normalizedToken = numberToken as NormalizedToken
  const unit = normalizeUnit(numberToken.unit)
  normalizedToken.originalUnit = reduceUnit({num: [...unit.num], den: [...unit.den]}) as Unit
  const [unitNormalDimension, conversion] = normalizeDimension(unit)
  numberToken.value = conversion.from(numberToken.value)
  numberToken.unit = reduceUnit(unitNormalDimension)
  return numberToken
}

export function normalizeUnit(unit: Unit | undefined): NormalizedCompositeUnit {
  if (typeof unit === 'string') {
    return {num: [unit], den: []}
  } else if (Array.isArray(unit)) {
    return {num: unit, den: []}
  } else return {
    num: unit ? (Array.isArray(unit.num) ? unit.num : [unit.num]) : [],
    den: unit ? (Array.isArray(unit.den) ? unit.den : [unit.den]) : []
  }
}

/**
 * Orders two from lowest to greatest
 * */
function orderTwo(numbers: [Decimal, Decimal]) {
  if (numbers[0].gt(numbers[1])) {
    const larger = numbers[0]
    numbers[0] = numbers[1]
    numbers[1] = larger
  }
  return numbers
}

function euclideanGCD(numbers: [Decimal, Decimal]) {
  do {
    orderTwo(numbers)
    numbers[1] = numbers[1].mod(numbers[0])
  } while (!numbers[1].eq(0))
  return numbers[0]
}
