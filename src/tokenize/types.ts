import Decimal from 'decimal.js'
import {Conversion, Unit} from '../units/definitions/base'

interface AbstractToken {
  type: string
}

export interface ListToken extends AbstractToken {
  type: 'list'
  tokens: [Exclude<Token, ListToken>, formatting?: FormattingToken][]
}

export interface NumberToken extends AbstractToken {
  type: 'number'
  value: Decimal
  unit?: Unit,
  isPercentage?: boolean,
}

export interface NormalizedToken extends NumberToken {
  unit: Unit,
  originalUnit: Unit,
}

export interface MultiUnitToken extends NumberToken {
  unit: Unit,
  numbers: NumberToken[],
  isPercentage?: false,
}

export type PureOrNormalNumberToken = Omit<NumberToken, 'unit'> | NormalizedToken

export interface PercentageToken extends NumberToken {
  isPercentage: true
  unit: never
}

export type NumericToken = NumberToken | NormalizedToken | PercentageToken

export enum TimeAccuracy {
  NoTime,
  Hour,
  Minute,
  Second,
  Millisecond,
}

export interface DateTimeToken extends AbstractToken {
  type: 'datetime'
  utcValue: NumberToken
  offset: Decimal
  hasYear: boolean
  timeAccuracy: TimeAccuracy
}

export interface IntervalToken extends AbstractToken {
  type: 'interval'
  fromUtcValue: NumberToken
  toUtcValue: NumberToken
  offset: Decimal
  hasYear: boolean
}

export type TemporalToken = DateTimeToken | IntervalToken

export interface OperatorToken extends AbstractToken {
  type: 'operator'
  value: Operator,
  arguments: Token[]
}

export enum Operator {
  Sum = 'sum', // commutative -> arbitrary amount of input numbers (alias "add")
  Subtract = 'subtract',
  Multiply = 'multiply',
  Divide = 'divide',
  Power = 'power',
  Modulo = 'modulo',
  Factorial = 'factorial',
  Absolute = 'absolute',
  Round = 'round', // round number N to nearest P (default: 1)
  Floor = 'floor', // dito
  Ceil = 'ceil', // dito
  Average = 'average',
  Median = 'median',
  Count = 'count',
  Root = 'root',
  Logarithm = 'logarithm',
  Min = 'min',
  Max = 'max',
  Mid = 'mid',
  Random = 'random',
  GCD = 'gcd',
  LCM = 'lcm',
  Permutation = 'permutation',
  Combination = 'combination',
  Clamp = 'clamp',
  CalendarWeek = 'CalendarWeek',
}

export interface OperationComplimentaryToken extends AbstractToken {
  type: 'complimentary'
  value: string
}

export interface AbstractFormattingToken extends AbstractToken {
  type: 'format',
  kind: Formatting,
}

export enum Formatting {
  Unit = 'unit',
  Pure = 'pure',
  NonInt = 'non-int',
  Timezone = 'timezone',
}

export interface UnitFormattingToken extends AbstractFormattingToken {
  type: 'format',
  kind: Formatting.Unit,
  unit: Unit,
  original: string,
  conversion: Conversion,
}

export interface PureFormattingToken extends AbstractFormattingToken {
  type: 'format',
  kind: Formatting.Pure,
  thousandsSeparator?: boolean,
}

export enum NonIntFormat {
  Percent = 'percent',
  Fraction = 'fraction',
  Decimal = 'decimal',
  Multiplier = 'multiplier',
}

export interface NonIntFormattingToken extends AbstractFormattingToken {
  type: 'format',
  kind: Formatting.NonInt,
  format: NonIntFormat,
  /**
   * @description Base value to which to relate to a relative format like percent or multiplier
   * @example "5 as multiplier of 2" -> `relativeTo === 2`, result would be `5 / 2 => 2.5x` or `4 is 2.5x of 2`
   * */
  relativeTo: Decimal,
  /**
   * @description Base value to which to relate to and on top of a relative format like percent or multiplier
   * @example "5 as multiplier on 2" -> `relativeOver === 2`, result would be `(5 - 2) / 2 - 5 => 1.5x` or `5 is 1.5x on 2`
   * */
  relativeOver: Decimal,
}

export interface TimezoneFormattingToken extends AbstractFormattingToken {
  type: 'format',
  kind: Formatting.Timezone,
  offset: Decimal,
}

export type FormattingToken =
  UnitFormattingToken
  | PureFormattingToken
  | NonIntFormattingToken
  | TimezoneFormattingToken

export enum EquationShape {
  CrossMul = 'cross-mul',
  Standard = 'standard',
}

export interface EquationToken extends AbstractToken {
  type: 'equation',
  kind: EquationShape,
  left: Token | WhatToken
  right: Token | WhatToken
}

export interface WhatToken extends AbstractToken {
  type: 'what'
  isPercentage?: true
}

export type Token =
  ListToken
  | TemporalToken
  | NumberToken
  | MultiUnitToken
  | PercentageToken
  | OperatorToken
  | OperationComplimentaryToken
  | EquationToken
  | WhatToken
