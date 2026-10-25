import {findNumberWord} from './number-words'
import {resolve} from './resolve'
import {DateTimeToken, FormattingToken, ListToken, NumberToken, Token} from './tokenize/types'
import {placeHolderRegex, tokenize} from './tokenize'
import {numberPlaceholder} from './tokenize/base'
import {ExchangeRate} from './units/exchange-rate'
import {setExchangeRate} from './context'
import {formatNumber} from './format'

export function evaluate(expression: string, format?: true, exchangeRate?: ExchangeRate): string
export function evaluate(expression: string, format?: false, exchangeRate?: ExchangeRate): NumberToken | DateTimeToken | null
export function evaluate(expression: string, format: boolean = true, exchangeRate?: ExchangeRate) {
  try {
    if (exchangeRate) setExchangeRate(exchangeRate)
    const [token, formatting] = tokenizeFromString(expression)
    if (!token) return format ? '' : null
    if (token.type === 'list') {
      if (format) {
        return token.tokens.map(([token, formatting]) => resolveAndFormat(token, formatting ?? undefined)).join(', ')
      } else {
        return token.tokens.map(([token]) => resolveAndFormat(token, false))
      }
    } else {
      if (format) return resolveAndFormat(token, formatting ?? undefined)
      else return resolveAndFormat(token, false)
    }
  } catch (error) {
    console.error(error)
    if (format) return 'Error'
    else return null
  }
}

function resolveAndFormat(token: Exclude<Token, ListToken>, formatting?: FormattingToken): string
function resolveAndFormat(token: Exclude<Token, ListToken>, formatting: false): NumberToken | DateTimeToken | null
function resolveAndFormat(token: Exclude<Token, ListToken>, formatting?: FormattingToken | false) {
  const result = resolve(token)
  if (formatting == false) return result
  if (result === null) return ''
  else return formatNumber(result, formatting ?? undefined)
}

function replaceNumberWords(text: string) {
  let numberWord
  while (numberWord = findNumberWord(text)) {
    text = text.replace(numberWord.match, numberWord.data.toString())
  }
  return text
}

function normalize(expression: string) {
  expression = replaceNumberWords(expression)
  expression = expression.replace(/\s+/g, ' ')
  return expression
}

const letterRegexp = /\p{L}/u

function denest(expression: string): { tokens: Token[], expression: string } {
  let parsed: string[] = [''], depth = 0
  const tokens: Token[] = []
  let possibleOperator = ''
  for (const character of expression) {
    if (character === '(' && depth === 0) {
      parsed.push('')
    } else if (character === ')' && depth === 1) {
      const token = evaluate(parsed[parsed.length - 1], false)
      if (token) {
        tokens.push(token)
        if (possibleOperator) {
          parsed[parsed.length - 2] = parsed[parsed.length - 2].substring(0, parsed[parsed.length - 2].length - possibleOperator.length)
          parsed[parsed.length - 1] = `${possibleOperator}(${numberPlaceholder + (tokens.length - 1)})`
        } else {
          parsed[parsed.length - 1] = numberPlaceholder + (tokens.length - 1)
        }
        parsed.push('')
      } else {
        parsed[parsed.length - 1] = ''
      }
    } else {
      parsed[parsed.length - 1] += character
    }

    if (character === '(') depth++
    else if (character === ')') depth--

    if (depth === 0) {
      if (letterRegexp.test(character)) {
        possibleOperator += character
      } else {
        possibleOperator = ''
      }
    }
  }
  return {tokens, expression: parsed.join(' ')}
}

function tokenizeFromString(expression: string): [Token | null, FormattingToken | null] {
  expression = expression.normalize('NFKD')
    .replaceAll('⁄', '/')
    .replaceAll(placeHolderRegex, '')
  expression = normalize(expression)
  const denested = denest(expression)
  return tokenize(denested.expression, denested.tokens)
}

export {FreeExchangerateAPI} from './units/exchange-rate'
export {ISO4217Currency} from './units/definitions/currency'
export {tokenizeFromString as tokenize, resolve, formatNumber, findNumberWord, replaceNumberWords, ExchangeRate}
export {normalizeUnit} from './resolve'
