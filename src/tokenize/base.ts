import {commonCurrencySymbols} from '../units/definitions/base'
import {durationLong, durationShort, tz, unitsLongWithSpaces, unitsShortWithSpaces} from './generated'
import {unitsLong, unitsShort} from '../units/definitions/parse'

/*
* Matches digits with decimal points ., and thousand-separators ,._
* Number symbols like pi
* Leading and trailing calculation symbols + × * / ÷ ^ ** % mod
* Leading currency symbols
* Trailing units
* */
export const letter = /\p{L}/u
// export const numberPlaceholder = '\ue000'
export const numberPlaceholder = '\u0376'
export const u = (char: string) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
export const numberPlaceholderRegex = new RegExp(`[+\\-]?${u(numberPlaceholder)}(?<phi>\\d+)`)
export const nativeNumberWords = ['π', 'pi', 'tau', 'phi', '∞', 'infinity'] as const
export const formattingKeywords = ['number', 'percent', '%', 'fraction', 'dec', 'decimal', 'multiplier', 'x']
export const escapedCommonCurrencySymbols = commonCurrencySymbols.map(sym => sym === '$' ? `\\${sym}` : sym)

export const arbitraryUnit = new RegExp(`(?:${unitsShortWithSpaces.source.replaceAll(' ', '\\s+')}\\b|(?-i:${unitsLongWithSpaces.source.replaceAll(' ', '\\s+')})\\b|(?!rounded|to|dp|digits|of|base|and|between|as|plus|minus|times\b|multiplied|over|divided|power(?:to|in|as)\\s+(?:${formattingKeywords.join('|')}))(?:%|[${letter.source}/${escapedCommonCurrencySymbols.join('')}]+?[0-9]?)(?![${letter.source}/]))`, 'u') /* todo exclude keywords */
export const largeNumberSuffixes = {k: 1e3, M: 1e6, G: 1e9, T: 1e12}
export const largeNumberSuffixRegex = new RegExp(`[${Object.keys(largeNumberSuffixes).join('')}]`)
export const digits = /[+-]?\d+(?:[,._]+\d+)*/
export const pureNumber = new RegExp(`(?<ds>${numberPlaceholderRegex.source}|${digits.source}(?-i:\\s*(?<s>${largeNumberSuffixRegex.source})\\b(?!\/))?|${nativeNumberWords.join('|')})`, 'iu')
export const durationUnit = new RegExp(`(?:(?-i:${durationShort.source})${durationLong.source})`, 'iu')
export const durationPart = new RegExp(`${pureNumber.source}\\s*(?<u>${durationUnit.source})`, 'iu')
export const duration = new RegExp(`(?<D>(?:${pureNumber.source.replace(/\(\?<([a-zA-Z]+)>/g, '(?<$1D>')}\\s*(?<uD>${durationUnit.source}))(?:\\s*${pureNumber.source.replace(/\(\?<([a-zA-Z]+)>/g, '(?<$1Dt>')}\\s*(?<uDt>${durationUnit.source}))*)`, 'iu')
export const feetUnits = new RegExp(`(?:${unitsShort.length.foot.source.replaceAll('\\b', '')}|${unitsLong.length.foot.source.replaceAll('\\b', '')})`, 'iu')
export const inchesUnits = new RegExp(`(?:${unitsShort.length.inch.source.replaceAll('\\b', '')}|${unitsLong.length.inch.source.replaceAll('\\b', '')})`, 'iu')
export const feetInches = new RegExp(`(?<ftin>${pureNumber.source.replace(/\(\?<([a-zA-Z]+)>/g, '(?<$1ft>')}${feetUnits.source}(?![23](?!${inchesUnits.source}))\\s*${pureNumber.source.replace(/\(\?<([a-zA-Z]+)>/g, '(?<$1in>')}${inchesUnits.source}?)`, 'iu')
export const number = new RegExp(`(?<up>${escapedCommonCurrencySymbols.join('|')})?(?:${duration.source}|${feetInches.source}|${pureNumber.source}(?:\\s*(?<u>${arbitraryUnit.source}))?)`, 'iu')
// export const number = new RegExp(`(?:${pureNumber.source})`, 'iu')
// export const number = /\d+/
export const listSeparator = /[,\s]*(?:and\s+)?/
export const numberList = new RegExp(`${number.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$11l>`)}(${listSeparator.source}${number.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$12l>`)}){1,}`, 'iu')
export const numberNotPlaceholder = new RegExp(number.source.replace(numberPlaceholderRegex.source + '|', ''), 'iu')
export const percentageUnit = /%|percent/
export const percentage = new RegExp(`${digits.source}\s+(${percentageUnit.source})`)
const numberBase = (i: number, isTrailing = false) => number.source.replace(/(\?\(\?<u)/, isTrailing ? '(?<u' : '$1').replace(/\(\?<([a-zA-Z]+)>/g, `(?<$1${i}>`)
export const d = (i: number) => `\\s*(?<n${i}>${duration.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$1${i}>`)})\\s*`
export const n = (i: number, isTrailing = false) => `\\s*(?<n${i}>${numberBase(i, isTrailing)})\\s*`
export const nw = (i: number, isTrailing = false) => `\\s*(?:(?<n${i}>${numberBase(i, isTrailing)})|(?<w${i}>what))\\s*`
export const l = (i: number) => `\\s*(?<l${i}>${numberList.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$1${i}>`)})\\s*`
export const np = (i: number) => `\\s*(?<n${i}>${numberPlaceholderRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$1${i}>`)})\\s*`
export const pn = (i: number) => `\\s*(?<n${i}>${pureNumber.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$1${i}>`)})\\s*`
export const pnw = (i: number) => `\\s*(?:(?<n${i}>${pureNumber.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$1${i}>`)})|(?<w${i}>what))\\s*`
export const trimOptionalSpace = (source: string) => {
  if (source.startsWith('\\s*')) source = source.substring(3)
  if (source.endsWith('\\s*')) source = source.substring(0, source.length - 3)
  return source
}
export const addWtoN = (regex: RegExp) => {
  let source = regex.source
  const escaped = RegExp.escape(trimOptionalSpace(n(numberPlaceholder as unknown as number))).replaceAll(numberPlaceholder, '(\\d+)')
  source = source.replaceAll(new RegExp(escaped, 'g'), (match, cap) => trimOptionalSpace(nw(cap)))
  const escapedTrailing = RegExp.escape(trimOptionalSpace(n(numberPlaceholder as unknown as number, true))).replaceAll(numberPlaceholder, '(\\d+)')
  source = source.replaceAll(new RegExp(escapedTrailing, 'g'), (match, cap) => trimOptionalSpace(nw(cap, true)))
  const escapedPure = RegExp.escape(trimOptionalSpace(pn(numberPlaceholder as unknown as number))).replaceAll(numberPlaceholder, '(\\d+)')
  source = source.replaceAll(new RegExp(escapedPure, 'g'), (match, cap) => trimOptionalSpace(pnw(cap)))
  return new RegExp(source, regex.flags)
}

type RegExpFac<WithTrailing extends boolean = false> = (i: number, isTrailing?: WithTrailing extends true ? boolean : never) => string
const a = () => '.+?'
export const scout = (make: (funcs: {
  n: RegExpFac<true>
  np: RegExpFac<true>
  pn: RegExpFac<true>
  l: RegExpFac<true>
  d: RegExpFac<true>
}) => string): [RegExp, RegExp] => {
  return [
    new RegExp(make({n: a, np: a, pn: a, l: a, d: a})),
    new RegExp(make({n, np, pn, l, d})),
  ]
}

// "English (Europe)", using this as a version for international english
export const LOCALE = 'en-150'
const weekdays = Array.from({length: 7}, (_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: 'long'}).format(new Date(2000, 0, 3 + i)).toLowerCase())
export const weekdayIndexFromString = (value: string) => {
  if (!value) return null
  const index = weekdays.findIndex(weekday => value.toLowerCase().substring(0, 3) === weekday.toLowerCase().substring(0, 3))
  return index > -1 ? index : null
}
const weekdaysRegex = new RegExp(`(?<wd>${weekdays.map(weekday => {
  if (weekday.length > 3) return `\\b${weekday.substring(0, 3)}(?:${weekday.substring(3)})?\\b`
  else return weekday
}).join('|')})`, 'i')
const dayRegex = /(?<d>\d{1,2})(?:\.|st|nd|rd|th)?\b/
const months = Array.from({length: 12}, (_, i) => new Intl.DateTimeFormat(LOCALE, {month: 'long'}).format(new Date(2000, i, 1)).toLowerCase())
export const monthIndexFromString = (value: string) => {
  if (!value) return null
  const index = months.findIndex(month => value.toLowerCase().substring(0, 3) === month.toLowerCase().substring(0, 3))
  return index > -1 ? index : null
}
const monthRegex = new RegExp(`(?:${months.map(month => {
  if (month.length > 3) return `${month.substring(0, 3)}(?:${month.substring(3)})?`
  else return month
}).join('|')})`, 'i')
const numbersOnlyDate = /(?<yn1>\d{4})[.\/\\-](?<mon1>\d{1,2})[.\/\\-](?<dn1>\d{1,2})|(?<dn2>\d{1,2})[.\/\\-](?<mon2>\d{1,2})[.\/\\-](?<yn2>\d{4})/
const longDate = new RegExp(`(?:${weekdaysRegex.source},?\\s+)?(?:${dayRegex.source.replace('(?<d>', `(?<d1>`)}\\s+(?<m1>${monthRegex.source})|(?<m2>${monthRegex.source})\\s+${dayRegex.source.replace('(?<d>', `(?<d2>`)})(?:\\s*,?\\s+(?<y>\\d{4})\\b)?`, 'gi')
const weekdayDate = new RegExp(`${weekdaysRegex.source}`, 'gi')
const longTimeRegex = /(?<hr2>\d{1,2}):(?<min>\d{1,2})(?::(?<sc>\d{1,2})(?:\.(?<sfr>\d+))?)?(?:\s*(?<md2>[ap]\.?m\.?)|Z)?/
export const timeZoneRegex = new RegExp(`(?:(?:in\\s+)?(?<tzl>${tz.source})|(?<tz>(?:gmt|utc)?[+-]\\d{1,2}(?::?\\d{1,2})?|utc?|gmt|[ecmp][sd]t))`)
const timeSuffixRegex = new RegExp(`(?:\\s+o'?clock)?${timeZoneRegex.source}`)
const outOfContextTimeRegex = new RegExp(`(?:${longTimeRegex.source}|(?<hr1>\\d{1,2})\\s*(?<md1>[ap]\\.?m\\.?))(?:\\s*${timeSuffixRegex.source})?`)
const timeRegex = new RegExp(`(?:${longTimeRegex.source}|(?<hr1>\\d{1,2})\\s*(?<md1>[ap]\\.?m\\.?)?)(?:\\s*${timeSuffixRegex.source})?`)
const dateKeywords = /now|today|yesterday|tomorrow/
// instant with date and (implicit) time
// todo (this|last|next) (<weekdays>)
export const isInstant = new RegExp(`(?:(?<dk>${dateKeywords.source})|(?:${longDate.source})|(?:${weekdayDate.source})|(?:${numbersOnlyDate.source}))(?:\\s*(?:,|at|T)?\\s*${timeRegex.source})?`, 'gi')
// time interval with start date-time and end date-time (albeit implicit, e.g. "February 2020")
// todo (this|last|next) (week|weekend|month|year|decade)
// todo semesters
export const isInterval = new RegExp(`Q(?<qn>[1-4])(?:\\s+of\\s+(?<qy>\\d{4}))?|(?!dec\\b)(?<m>${monthRegex.source})\\b(?:\\s*,?\\s+(?<y>\\d{4})\\b)?`, 'gi')
// time-instant without explicit date
export const isTime = new RegExp(`${outOfContextTimeRegex.source}`, 'gi')
// durations are handled by the standard units
