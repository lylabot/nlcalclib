import Decimal from 'decimal.js'
import {isInstant, isInterval, isTime, monthIndexFromString, numberPlaceholder, weekdayIndexFromString} from './base'
import {timezoneCitiesLower, timezoneCountriesLower} from './generated'
import {DateTimeToken, IntervalToken, TimeAccuracy, Token} from './types'

export function parseDates(expression: string, tokens: Token[]) {
  expression = expression.replaceAll(isInstant, (match, ...args) => {
    const groups = args.pop()
    const keyword = groups.dk
    const weekday = groups.wd
    const dayString = groups.d1 ?? groups.d2 ?? groups.dn1 ?? groups.dn2
    const monthNumberString = groups.mon
    const monthString = groups.m1 ?? groups.m2
    const yearString = groups.y ?? groups.yn1 ?? groups.yn2
    const hourString = groups.hr1 ?? groups.hr2
    const minuteString = groups.min
    const secondString = groups.sc
    const secondFractionString = groups.sfr
    const millisecondString = secondFractionString
      ? String(secondFractionString).padEnd(4, '0').replace(/(\d{3})(\d+)/, '$1.$2')
      : undefined
    const timeModeString = groups.md1 ?? groups.md2
    const is12hPastNoon = timeModeString?.trim().replaceAll('.', '') === 'pm'
    const timeZoneLocationString = groups.tzl ?? ''
    const timeZoneString = groups.tz ?? 'UTC'
    let date
    if (!keyword) {
      const timeString =
        (parseNumberOr(hourString, 0) + (is12hPastNoon ? 12 : 0)).toString().padStart(2, '0') + ':' +
        parseNumberOr(minuteString, 0).toString().padStart(2, '0') + ':' +
        parseNumberOr(secondString, 0).toString().padStart(2, '0') + '.' +
        String(parseNumberOr(secondFractionString, 0)) + 'Z'
      if (weekday && !dayString) {
        date = new Date(
          new Date().getUTCFullYear() + '-' +
          String(new Date().getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(new Date().getUTCDate()).padStart(2, '0') + 'T' +
          timeString
        )
        const dayOffset = (weekdayIndexFromString(weekday) as number + 1) - date.getUTCDay()
        date.setUTCDate(date.getUTCDate() + dayOffset)
      } else {
        date = new Date(
          parseNumberOr(yearString, new Date().getUTCFullYear()) + '-' +
          String((monthIndexFromString(monthString) ?? (Number(monthNumberString) - 1)) + 1).padStart(2, '0') + '-' +
          String(Number(dayString)).padStart(2, '0') + 'T' +
          timeString
        )
      }
    } else {
      date = new Date()
      let isTimed = false
      if (keyword.toLowerCase() === 'today') {
        date.setUTCHours(0, 0, 0, 0)
      } else if (keyword.toLowerCase() === 'tomorrow') {
        date.setUTCHours(0, 0, 0, 0)
        date.setDate(date.getDate() + 1)
      } else if (keyword.toLowerCase() === 'yesterday') {
        date.setUTCHours(0, 0, 0, 0)
        date.setUTCDate(date.getUTCDate() - 1)
      } else {
        isTimed = true
      }
      if (!isTimed) {
        date.setUTCHours(
          (parseNumberOr(hourString, 0) + (is12hPastNoon ? 12 : 0)),
          parseNumberOr(minuteString, 0),
          parseNumberOr(secondString, 0),
          parseNumberOr(millisecondString, 0)
        )
      }
    }
    const offset = getOffsetFromLocation(timeZoneLocationString) || getOffset(timeZoneString)
    date.setUTCMinutes(date.getUTCMinutes() - offset)
    const token: DateTimeToken = {
      type: 'datetime',
      utcValue: {type: 'number', value: Decimal(date.valueOf())},
      offset: Decimal(offset),
      hasYear: !!yearString,
      timeAccuracy: !hourString ? TimeAccuracy.NoTime : !minuteString ? TimeAccuracy.Hour : !secondString ? TimeAccuracy.Minute : !secondFractionString ? TimeAccuracy.Second : TimeAccuracy.Millisecond
    }
    return numberPlaceholder + (tokens.push(token) - 1)
  }).replaceAll(isInterval, (match, ...args) => {
    const groups = args.pop()
    const quarterString = groups.qn
    const quarterYearString = groups.qy
    if (quarterString) {
      const quarterNumber = Number(quarterString)
      const fromDate = new Date(
        parseNumberOr(quarterYearString, new Date().getUTCFullYear()) + '-' +
        String((quarterNumber - 1) * 3 + 1).padStart(2, '0') + '-01T00:00:00Z'
      )
      const toDate = new Date(
        (parseNumberOr(quarterYearString, new Date().getUTCFullYear()) + Number(quarterNumber === 4)) + '-' +
        String((quarterNumber - 1) * 3 + 4).padStart(2, '0') + '-01T00:00:00Z')
      toDate.setUTCMilliseconds(toDate.getUTCMilliseconds() - 1)
      const token: IntervalToken = {
        type: 'interval',
        fromUtcValue: {type: 'number', value: Decimal(fromDate.valueOf())},
        toUtcValue: {type: 'number', value: Decimal(toDate.valueOf())},
        offset: Decimal(0),
        hasYear: !!quarterYearString,
      }
      return numberPlaceholder + (tokens.push(token) - 1)
    } else {
      const monthString = groups.m
      const yearString = groups.y
      const fromDate = new Date(
        parseNumberOr(yearString, new Date().getUTCFullYear()) + '-' +
        String((monthIndexFromString(monthString) as number) + 1).padStart(2, '0') + '-01T00:00:00Z'
      )
      const toDate = new Date(fromDate)
      toDate.setUTCMonth(toDate.getUTCMonth() + 1)
      toDate.setUTCMilliseconds(toDate.getUTCMilliseconds() - 1)
      const token: IntervalToken = {
        type: 'interval',
        fromUtcValue: {type: 'number', value: Decimal(fromDate.valueOf())},
        toUtcValue: {type: 'number', value: Decimal(toDate.valueOf())},
        offset: Decimal(0),
        hasYear: !!yearString,
      }
      return numberPlaceholder + (tokens.push(token) - 1)
    }
  }).replaceAll(isTime, (match, ...args) => {
    const groups = args.pop()
    const hourString = groups.hr1 ?? groups.hr2
    const minuteString = groups.min
    const secondString = groups.sc
    const secondFractionString = groups.sfr
    const timeModeString = groups.md1 ?? groups.md2
    const is12hPastNoon = timeModeString?.trim().replaceAll('.', '') === 'pm'
    const timeZoneLocationString = groups.tzl ?? ''
    const timeZoneString = groups.tz ?? 'UTC'
    const date = new Date(
      new Date().getUTCFullYear() + '-' +
      String(new Date().getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(new Date().getUTCDate()).padStart(2, '0') + 'T' +
      (parseNumberOr(hourString, 0) + (is12hPastNoon ? 12 : 0)).toString().padStart(2, '0') + ':' +
      parseNumberOr(minuteString, 0).toString().padStart(2, '0') + ':' +
      parseNumberOr(secondString, 0).toString().padStart(2, '0') + '.' +
      String(parseNumberOr(secondFractionString, 0)) + 'Z'
    )
    const offset = getOffsetFromLocation(timeZoneLocationString) || getOffset(timeZoneString)
    date.setUTCMinutes(date.getUTCMinutes() - offset)
    const token: DateTimeToken = {
      type: 'datetime',
      utcValue: {type: 'number', value: Decimal(date.valueOf())},
      offset: Decimal(offset),
      hasYear: false,
      timeAccuracy: !minuteString ? TimeAccuracy.Hour : !secondString ? TimeAccuracy.Minute : !secondFractionString ? TimeAccuracy.Second : TimeAccuracy.Millisecond
    }
    return numberPlaceholder + (tokens.push(token) - 1)
  })
  return expression
}

function parseNumberOr<F extends any>(value: any, fallback: F): number | F {
  const number = Number(value)
  return isNaN(number) ? fallback : number
}

const offsetMatcher = /([+-])(\d+)(?::(\d+))?/
export const getOffset = (timeZone: string) => {
  timeZone = timeZone.replace(/(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{1,2}))?/, (match, sign, hr, min) =>
    `${sign}${String(hr).padStart(2, '0')}:${String(min ?? 0).padStart(2, '0')}`
  )
  const timeZoneName = Intl.DateTimeFormat('ia', {timeZoneName: 'short', timeZone})
    .formatToParts()
    .find((i) => i.type === 'timeZoneName')?.value
  const offset = timeZoneName?.slice(3)
  if (!offset) return 0

  const matchData = offset.match(offsetMatcher)
  if (!matchData) return 0

  const [, sign, hour, minute] = matchData
  let result = Number(hour) * 60
  if (sign === "-") result *= -1
  if (minute) result += Number(minute)

  return result
}
export const getOffsetFromLocation = (timeZoneLocation: string) => {
  timeZoneLocation = timeZoneLocation.replace(/\s+/g, '_').toLowerCase()
  const timeZone = Intl.supportedValuesOf('timeZone').find(tz => tz.toLowerCase().endsWith(timeZoneLocation)) ??
    Object.keys(timezoneCitiesLower).find(tz => timezoneCitiesLower[tz].includes(timeZoneLocation)) ??
    timezoneCountriesLower[timeZoneLocation]
  return !timeZone ? 0 : getOffset(timeZone)
}
