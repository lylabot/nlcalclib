import Decimal from 'decimal.js'
import {NumberToken, Operator, PercentageToken, Token} from './tokenize/types'
import {formatUnit} from './units/utils'

type NerdamerFuncType = string | ((...args: Token[]) => string)
const nerdamerFuncs = {
  [Operator.Sum]: (...tokens: Token[]) => {
    if (tokens.length === 2 && !(tokens[0] as PercentageToken).isPercentage && (tokens[1] as PercentageToken).isPercentage) {
      const token0String = stringifyToken(tokens[0])
      return `${token0String}+(${stringifyToken(tokens[1])}*${token0String})`
    }
    return tokens.map(stringifyToken).join('+')
  },
  [Operator.Subtract]: (...tokens: Token[]) => {
    if (tokens.length === 2 && !(tokens[0] as PercentageToken).isPercentage && (tokens[1] as PercentageToken).isPercentage) {
      const token0String = stringifyToken(tokens[0])
      return `${token0String}-(${stringifyToken(tokens[1])}*${token0String})`
    }
    return tokens.map(stringifyToken).join('-')
  },
  [Operator.Multiply]: (...tokens: Token[]) => tokens.map(stringifyToken).join('*'),
  [Operator.Divide]: (...tokens: Token[]) => tokens.map(stringifyToken).join('/'),
  [Operator.Power]: (...tokens: Token[]) => tokens.map(stringifyToken).join('^'),
  [Operator.Modulo]: 'mod',
  [Operator.Factorial]: 'fact',
  [Operator.Absolute]: 'abs',
  [Operator.Round]: 'round',
  [Operator.Floor]: 'floor',
  [Operator.Ceil]: 'ceil',
  [Operator.Average]: 'mean',
  [Operator.Median]: 'median',
  // [Operator.Count]: (...tokens) => String(tokens.length),
  [Operator.Root]: (comp, value) => {
    let compValue
    if (comp.type === 'complimentary') {
      if (comp.value === 'square') compValue = 2
      else if (comp.value === 'cube') compValue = 3
    } else {
      compValue = (comp as NumberToken).value
    }
    return `exp(${(value as NumberToken).value}, divide(1, ${compValue}))`
  },
  [Operator.Logarithm]: 'log',
  [Operator.Min]: 'min',
  [Operator.Max]: 'max',
  [Operator.Mid]: 'mean',
  [Operator.Random]: (min, max) => Decimal.random()
    .mul(Decimal.sub((max as NumberToken).value, (min as NumberToken).value))
    .add((min as NumberToken).value).toString(),
  [Operator.GCD]: 'gcd',
  [Operator.LCM]: 'lcm',
  // [Operator.Permutation]: 'permutation',
  // [Operator.Combination]: ['combination'],
  // [Operator.Clamp]: 'clamp',
} satisfies { [K in Exclude<Operator, Operator.Count | Operator.Permutation | Operator.Combination | Operator.Clamp | Operator.CalendarWeek>]: NerdamerFuncType }

export function stringifyToken(token: Token): string {
  if (token.type === 'operator') {
    const func = nerdamerFuncs[token.value as keyof typeof nerdamerFuncs] as NerdamerFuncType
    if (typeof func === 'string') {
      return `${func}(${token.arguments.map(stringifyToken)})`
    } else {
      return func(...token.arguments)
    }
  } else if (token.type === 'number') {
    if (token.unit) {
      return `(${token.value.toString()}*${formatUnit(token.unit)[0]})`
    } else if ((token as PercentageToken).isPercentage) {
      return token.value.mul(100).toString() + '%'
    } else {
      return token.value.toString()
    }
  } else if (token.type === 'what') {
    if (token.isPercentage) return '(x%)'
    return 'x'
  } else return ''
}

export function isWhatPercentage(token: Token): boolean | null {
  if (token.type === 'what') {
    return token.isPercentage ?? false
  } else if (token.type === 'operator') {
    // OR || is correct here, we want to return if ANY what token is a percentage
    return token.arguments.reduce<boolean | null>((acc, arg) => acc || isWhatPercentage(arg), null)
  } else return null
}
