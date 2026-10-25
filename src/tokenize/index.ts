import Decimal from 'decimal.js'
import {
  DateTimeToken,
  EquationShape,
  EquationToken,
  Formatting,
  FormattingToken,
  ListToken,
  MultiUnitToken,
  NonIntFormat,
  NumberToken,
  OperationComplimentaryToken,
  Operator,
  OperatorToken,
  TimeAccuracy,
  Token,
  UnitFormattingToken
} from './types'
import {
  addWtoN,
  durationPart,
  listSeparator,
  number,
  numberNotPlaceholder,
  numberPlaceholder,
  numberPlaceholderRegex,
  percentageUnit
} from './base'
import {
  equationRegex,
  formattingRegex,
  operatorFuncNames,
  operatorsRegex,
  orderOfOperations,
  temporalRegex
} from './regex'
import {getOffset, getOffsetFromLocation, parseDates} from './date'
import {findUnit, parseNumber} from './number'
import {unitsConversions} from '../units/definitions/conversion'
import {Conversion} from '../units/definitions/base'

type NestedArray<V> = (V | NestedArray<V>)[]

function preservingFlat<V>(nested: NestedArray<V>) {
  const flattened: V[] = []
  for (const nestedElement of nested) {
    if (Array.isArray(nestedElement)) {
      flattened.push(...preservingFlat(nestedElement))
    } else {
      flattened.push(nestedElement)
    }
  }
  for (let i = 0; i < flattened.length; i++) {
    if (flattened[i] === undefined) delete flattened[i]
  }
  return flattened
}

const placeholders = [numberPlaceholderRegex]
export const placeHolderRegex = new RegExp(`(${placeholders
  .map(item => item instanceof RegExp ? item.source : item)
  .join('|')
})`, 'g')

export function tokenize(expression: string, tokens: Token[], parseWhat = false): [Token | null, FormattingToken | null] {
  expression = parseDates(expression, tokens)
  for (const operation in operatorFuncNames) {
    for (let funcName of operatorFuncNames[operation as keyof typeof operatorFuncNames]) {
      let overrideArgs: string[] = []
      if (Array.isArray(funcName)) {
        [funcName, ...overrideArgs] = funcName
      }
      const funcIndex = expression.indexOf(funcName + '(')
      if (funcIndex === -1) continue
      expression = expression.replace(new RegExp(`${funcName}\\(([^)]+)\\)`, 'g'), (match, c1) => {
        const token = {
          type: 'operator',
          value: operation as Operator,
          arguments: []
        } as OperatorToken
        // todo parse just numbers inside here, and "what" keyword
        if (numberPlaceholderRegex.test(c1)) {
          const argToken = tokens[Number(c1.substring(1))]
          if (Array.isArray(argToken)) {
            token.arguments.push(...argToken)
          } else {
            token.arguments.push(argToken)
          }
        } else {
          token.arguments.push(c1)
        }
        for (let i = 0; i < overrideArgs.length; i++) {
          if (!overrideArgs[i].startsWith('$')) continue
          const index = Number(overrideArgs[i].substring(1))
          if (isNaN(index)) continue
          token.arguments[i] = token.arguments[index]
        }
        for (let i = 0; i < overrideArgs.length; i++) {
          if (overrideArgs[i] == null || overrideArgs[i].startsWith('$')) continue
          token.arguments[i] = {
            type: 'complimentary',
            value: overrideArgs[i]
          }
        }
        return numberPlaceholder + (tokens.push(token) - 1)
      })
    }
  }
  let tree: Token | null = null
  let match: RegExpExecArray | null = null,
    matchedOperation: Operator | null = null,
    currentMatch: RegExpExecArray | null = null
  let formattingToken: FormattingToken | null = null;

  [expression, formattingToken] = tokenizeDurationExpressions(expression, tokens)

  for (const equation in equationRegex) {
    const match = equationRegex[equation as EquationShape].exec(expression)
    if (!match) continue
    const numbers = parseMatch(match, tokens, () => void 0)
    const token: Partial<EquationToken> = {
      type: 'equation',
      kind: equation as EquationShape,
    }
    if (equation === EquationShape.CrossMul) {
      token.left = {type: 'operator', value: Operator.Divide, arguments: [numbers[0], numbers[1]]} as OperatorToken
      token.right = {type: 'operator', value: Operator.Divide, arguments: [numbers[2], numbers[3]]} as OperatorToken
    } else {
      const numberOfSubInLeft = match[1].matchAll(new RegExp(numberPlaceholderRegex.source, 'g')).toArray().length
      token.left = tokenize(match[1], tokens.slice(0, numberOfSubInLeft), true)[0] as Token
      token.right = tokenize(match[2], tokens.slice(numberOfSubInLeft, tokens.length), true)[0] as Token
      if (!token.left || !token.right) continue
    }
    return [token as EquationToken, null]
  }

  for (const operations of orderOfOperations) {
    do {
      match = null
      matchedOperation = null
      currentMatch = null
      for (const operation of operations) {
        const [scout, regex_] = operatorsRegex[operation]
        const regex = parseWhat ? addWtoN(regex_) : regex_
        if (!scout.test(expression)) continue
        currentMatch = regex.exec(expression)
        if (!currentMatch) continue
        if (match === null || (currentMatch.index < match.index)) {
          matchedOperation = operation
          match = currentMatch
        }
      }
      if (match) {
        const token = {
          type: 'operator',
          value: matchedOperation as Operator,
          arguments: []
        } as OperatorToken
        const numbers: (Token | Token[])[] = match.groups ? parseMatch(match, tokens, () => tree = token) : []
        token.arguments = preservingFlat(numbers)
        tokens.push(token)
        expression =
          expression.substring(0, match.index) +
          numberPlaceholder + (tokens.length - 1) +
          expression.substring(match.index + match[0].length)
      }
    } while (match)
  }
  const list = expression.split(/,(?!\d)/g)
  if (list.length !== 1) {
    const token: ListToken = {
      type: 'list',
      tokens: list.map(sub => tokenize(sub, [...tokens], parseWhat))
        .filter(([token]) => token && token?.type !== 'list') as unknown as [Exclude<Token, ListToken>, formatting?: FormattingToken][]
    }
    return [token, null]
  }
  if (!tree) {
    const placeholderMatch = numberPlaceholderRegex.exec(expression)
    if (placeholderMatch) {
      tree = tokens[Number(placeholderMatch.groups?.phi)]
    }
    tree ??= tokens[0]
  }
  if (!tree) {
    const numberMatch = numberNotPlaceholder.exec(expression)
    if (numberMatch && numberMatch.groups) {
      tree = parseNumber(numberMatch.groups.ds, numberMatch.groups.up, numberMatch.groups.u, numberMatch.groups.s)
    }
  }
  // console.log(expression)
  if (!formattingToken && /in|as|to/.test(expression)) for (const formatting in formattingRegex) {
    const match = (formattingRegex[formatting as Exclude<Formatting, Formatting.Timezone>]).exec(expression)
    if (match && match.groups) {
      const groups = match.groups
      const token = {
        type: 'format',
        kind: formatting as Formatting,
      } as Partial<FormattingToken>
      for (const group in groups) {
        if (group.match(/\d$/) || group.match(/^[a-z]+_/)) continue
        const valueGroup = Object.keys(groups)
          .find(vg => vg.startsWith(group.substring(0, 1) + '_') && groups[group] === groups[vg])
          ?.substring(2)
        const value = valueGroup ?? groups[group] as string
        // @ts-ignore
        token[group] = value
        if (token.kind === Formatting.NonInt) {
          if ('dsrelof_' + value in groups && match.groups['dsrelof_' + value] !== undefined) {
            token.relativeTo = Decimal(match.groups['dsrelof_' + value] as string)
          } else if ('dsrelon_' + value in groups && match.groups['dsrelon_' + value] !== undefined) {
            token.relativeOver = Decimal(match.groups['dsrelon_' + value] as string)
          }
        }
      }
      if ('unit' in token) {
        [token.unit, token.conversion, token.original] = findUnit(token.unit as string)
      }
      formattingToken = token as FormattingToken
    }
  }
  // console.log(JSON.stringify(tree, null, 2), formattingToken)
  return [tree ?? null, formattingToken]
}

function tokenizeDurationExpressions(expression: string, tokens: Token[]): [string, FormattingToken | null] {
  let match: RegExpExecArray | null = null, formattingToken: FormattingToken | null = null
  match = temporalRegex.Ago.exec(expression)
  if (match && match.groups) {
    const args: Token[] = []
    parseDates('now', args)
    // todo combined duration (MultiUnitToken)
    args.push(parseNumber(match.groups.dsD1, undefined, match.groups.uD1))
    const token = {
      type: 'operator',
      value: Operator.Subtract,
      arguments: args,
    } as OperatorToken
    tokens.push(token)
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
  }
  match = temporalRegex.Since.exec(expression)
  if (match && match.groups) {
    const partialFormattingToken: Partial<UnitFormattingToken> = {
        type: 'format',
        kind: Formatting.Unit,
      }
    ;[partialFormattingToken.unit, partialFormattingToken.conversion, partialFormattingToken.original] = findUnit(match.groups.u)
    formattingToken = partialFormattingToken as UnitFormattingToken
    const args: Token[] = []
    const useTimeFidelity = unitsConversions.duration[partialFormattingToken.unit as keyof typeof unitsConversions.duration].from(Decimal(1)).lt(86400)
    parseDates(useTimeFidelity ? 'now' : 'today', args)
    args.push(tokens[Number(match.groups.phi1)])
    const token = {
      type: 'operator',
      value: Operator.Subtract,
      arguments: args,
    } as OperatorToken
    tokens.push(token)
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
  }
  match = temporalRegex.Till.exec(expression)
  if (match && match.groups) {
    const args: Token[] = []
    args.push(tokens[Number(match.groups.phi1)])
    parseDates('today', args)
    const token = {
      type: 'operator',
      value: Operator.Subtract,
      arguments: args,
    } as OperatorToken
    tokens.push(token)
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
    const partialFormattingToken: Partial<UnitFormattingToken> = {
        type: 'format',
        kind: Formatting.Unit,
      }
    ;[partialFormattingToken.unit, partialFormattingToken.conversion, partialFormattingToken.original] = findUnit(match.groups.u)
    formattingToken = partialFormattingToken as UnitFormattingToken
  }
  match = temporalRegex.Between.exec(expression)
  if (match && match.groups) {
    let index: number = null!
    for (let groupsKey in match.groups) {
      if (!groupsKey.startsWith('n1')) continue
      if (match.groups[groupsKey] == null) continue
      index = Number(groupsKey.replace('n1', ''))
    }
    const args: Token[] = []
    if (index === 3 || index === 4) {
      const interval = tokens[Number(match.groups['phi1' + index])]
      if (interval.type !== 'interval') {
        throw new Error('Is not an interval')
      }
      args.push({
        type: 'datetime',
        utcValue: interval.toUtcValue,
        offset: interval.offset,
        hasYear: interval.hasYear,
        timeAccuracy: TimeAccuracy.NoTime
      })
      args.push({
        type: 'datetime',
        utcValue: interval.fromUtcValue,
        offset: interval.offset,
        hasYear: interval.hasYear,
        timeAccuracy: TimeAccuracy.NoTime
      })
    } else {
      if (index === 2) {
        // x through y means <start of x> until <end of y>
        args.push({
          type: 'operator',
          value: Operator.Sum,
          arguments: [tokens[Number(match.groups['phi2' + index])], {
            type: 'number',
            unit: 'day',
            value: Decimal(1)
          }]
        })
      } else {
        args.push(tokens[Number(match.groups['phi2' + index])])
      }
      args.push(tokens[Number(match.groups['phi1' + index])])
    }
    const token = {
      type: 'operator',
      value: Operator.Subtract,
      arguments: args,
    } as OperatorToken
    tokens.push(token)
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
    const partialFormattingToken: Partial<UnitFormattingToken> = {
        type: 'format',
        kind: Formatting.Unit,
      }
    ;[partialFormattingToken.unit, partialFormattingToken.conversion, partialFormattingToken.original] = findUnit(match.groups['u' + index])
    formattingToken = partialFormattingToken as UnitFormattingToken
  }
  match = temporalRegex.TimezoneConversion.exec(expression)
  if (match && match.groups) {
    const timeZoneLocationString = match.groups.tzl1 ?? match.groups.tzl2 ?? ''
    const timeZoneString = match.groups.tz1 ?? match.groups.tz2 ?? 'UTC'
    const offset = getOffsetFromLocation(timeZoneLocationString) || getOffset(timeZoneString)
    formattingToken = {
      type: 'format',
      kind: Formatting.Timezone,
      offset: Decimal(offset),
    }
    expression =
      expression.substring(0, match.index) +
      (match.groups.n11 ?? match.groups.n12) +
      expression.substring(match.index + match[0].length)
  }
  match = temporalRegex.TimeInZone.exec(expression)
  if (match && match.groups) {
    const time = match.groups.t1 ?? match.groups.t2
    const args: Token[] = []
    parseDates('now', args)
    if (time === 'time') {
      (args[0] as DateTimeToken).timeAccuracy = TimeAccuracy.Minute
    }
    tokens.push(args[0])
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
    const timeZoneLocationString = match.groups.tzl1 ?? match.groups.tzl2 ?? ''
    const timeZoneString = match.groups.tz1 ?? match.groups.tz2 ?? 'UTC'
    const offset = getOffsetFromLocation(timeZoneLocationString) || getOffset(timeZoneString)
    formattingToken = {
      type: 'format',
      kind: Formatting.Timezone,
      offset: Decimal(offset),
    }
  }
  match = temporalRegex.TimezoneDifference.exec(expression)
  if (match && match.groups) {
    const zone1 = getOffsetFromLocation(match.groups.tzl1 ?? '') || getOffset(match.groups.tz1 ?? 'UTC')
    const zone2 = getOffsetFromLocation(match.groups.tzl2 ?? '') || getOffset(match.groups.tz2 ?? 'UTC')
    const token = {
      type: 'operator',
      value: Operator.Absolute,
      arguments: [{
        type: 'operator',
        value: Operator.Subtract,
        arguments: [
          {type: 'number', value: Decimal(zone1), unit: 'minute'},
          {type: 'number', value: Decimal(zone2), unit: 'minute'},
        ]
      }],
    } as OperatorToken
    tokens.push(token)
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
  }
  match = temporalRegex.CurrentUnix.exec(expression)
  if (match) {
    const token = {type: 'number', value: Decimal(Date.now()).div(1000), unit: 'second'} as NumberToken
    formattingToken = {type: 'format', kind: Formatting.Pure, thousandsSeparator: false}
    tokens.push(token)
    expression =
      expression.substring(0, match.index) +
      numberPlaceholder + (tokens.length - 1) +
      expression.substring(match.index + match[0].length)
  }
  return [expression, formattingToken]
}

function parseMatch(match: RegExpExecArray, tokens: Token[], useAsTree: () => void) {
  const numbers: (Token | Token[])[] = []
  for (const name in match.groups) {
    if (!match.groups[name]) continue
    if (/^n\d+$/.test(name)) {
      const numberIndex = name.substring(1)
      const argumentIndex = Number(name[1]) - 1
      if (match.groups['n' + numberIndex] === match.groups['D' + numberIndex]) {
        let number = match.groups['D' + numberIndex]
        let subMatch = null
        const token: MultiUnitToken = {
          type: 'number',
          value: Decimal(0),
          unit: 'second',
          numbers: []
        }
        while (subMatch = number.match(durationPart)) {
          if (!subMatch.groups) break
          number = number.substring(subMatch[0].length).trim()
          const digits = subMatch.groups['ds']
          const unit = subMatch.groups['u']
          const suffix = subMatch.groups['s']
          const subToken = parseNumber(digits, undefined, unit, suffix)
          if (typeof subToken.unit === 'string' && subToken.unit in unitsConversions.duration) {
            // @ts-ignore
            const conversion = unitsConversions.duration[subToken.unit] as Conversion
            token.value = token.value.add(conversion.from(subToken.value))
            token.numbers.push(subToken)
          }
        }
        numbers[argumentIndex] = token
      } else {
        const digits = match.groups['ds' + numberIndex]
        const unitPrefix = match.groups['up' + numberIndex]
        const unit = match.groups['u' + numberIndex]
        const suffix = match.groups['s' + numberIndex]
        let placeholderMatch
        if ((placeholderMatch = numberPlaceholderRegex.exec(match.groups[name]))) {
          useAsTree()
          numbers[argumentIndex] ??= tokens[Number(placeholderMatch.groups?.phi)]
        } else if (!digits) {
          numbers[argumentIndex] ??= {
            type: 'complimentary',
            value: match.groups[name]
          } as OperationComplimentaryToken
        } else {
          numbers[argumentIndex] ??= parseNumber(digits, unitPrefix, unit, suffix)
        }
      }
    } else if (/^l\d+$/.test(name)) {
      const argumentIndex = Number(name[1]) - 1
      let listString = match.groups[name]
      const matchFirstItem = new RegExp(`(${number.source})(${listSeparator.source})*`, 'iu')
      const list: Token[] = []
      let subMatch: RegExpExecArray | null = null
      do {
        subMatch = matchFirstItem.exec(listString)
        if (!subMatch || !subMatch.groups) break
        listString = listString.substring(subMatch[0].length)
        // special case and ONLY case in lists, it's what the (?:and\s+) is
        if (subMatch.groups.u?.trim() === 'and') {
          // @ts-ignore
          subMatch.groups.u = undefined
        }
        const phi = subMatch.groups.phiD ?? subMatch.groups.phiDt ?? subMatch.groups.phi
        if (phi) {
          list.push(tokens[Number(phi)])
        } else {
          list.push(parseNumber(subMatch.groups.ds, subMatch.groups.up, subMatch.groups.u, subMatch.groups.s))
        }
      } while (match)
      numbers[argumentIndex] = list
    } else if (/^w\d+$/.test(name)) {
      const argumentIndex = Number(name[1]) - 1
      const numberIndex = name.substring(1)
      const unit = match.groups['u' + numberIndex]
      numbers[argumentIndex] = {type: 'what'}
      if (percentageUnit.test(unit)) {
        numbers[argumentIndex].isPercentage = true
      }
    }
  }
  return numbers
}
