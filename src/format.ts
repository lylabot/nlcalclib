import Decimal from 'decimal.js'
import {formatUnit, fromToUnits} from './units/utils'
import {
  DateTimeToken,
  Formatting,
  FormattingToken, MultiUnitToken,
  NonIntFormat,
  NormalizedToken,
  NumericToken,
  PercentageToken,
  TimeAccuracy
} from './tokenize/types'
import {LOCALE} from './tokenize/base'
import {ISO4217Currency} from './units/definitions/currency'
import {getExchangeRate} from './context'
import {unitsConversions} from './units/definitions/conversion'
import {Conversion} from './units/definitions/base'

export function formatNumber(number: NumericToken | DateTimeToken, formatting?: FormattingToken) {
  // console.log(number, formatting)
  let string: string
  if (number.type === 'number' && formatting?.kind === 'unit' && typeof formatting.unit === 'string' && formatting.unit.toLowerCase() === 'date') {
    const isMilliseconds = number.value.e >= 12
    number = {
      type: 'datetime',
      utcValue: {...number, value: number.value.mul(isMilliseconds ? 1 : 1000)},
      offset: Decimal(0),
      hasYear: true,
      timeAccuracy: isMilliseconds ? TimeAccuracy.Millisecond : TimeAccuracy.Second,
    }
  }
  if (number.type === 'datetime') {
    string = ''
    const dateObj = new Date(number.utcValue.value.toNumber())
    if (formatting?.kind === 'unit' && typeof formatting.unit === 'string') {
      if (formatting.unit.toLowerCase() === 'iso') {
        string = dateObj.toISOString()
      } else if (formatting.unit.toLowerCase() === 'timestamp') {
        string = dateObj.valueOf().toString().replace(/\d{3}$/, '')
      }
    }
    if (!string) {
      const offset = formatting?.kind === Formatting.Timezone ? formatting.offset : number.offset
      const timeZone = `${offset.isNeg() ? '-' : '+'}${offset.abs().divToInt(60).toString().padStart(2, '0')}:${offset.abs().mod(60).toString().padStart(2, '0')}`
      const dateFormattingOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: number.hasYear ? 'numeric' : undefined,
      }
      dateFormattingOptions.timeZone = timeZone
      if (number.timeAccuracy !== TimeAccuracy.NoTime) {
        if (timeZone !== '+00:00' || formatting?.kind === Formatting.Timezone) {
          dateFormattingOptions.timeZoneName = 'shortGeneric'
        }
        dateFormattingOptions.hour = 'numeric'
        if (number.timeAccuracy !== TimeAccuracy.Hour || !offset.sub(number.offset).abs().mod(60).eq(0)) {
          dateFormattingOptions.hour = '2-digit'
          dateFormattingOptions.minute = '2-digit'
          if (number.timeAccuracy !== TimeAccuracy.Hour && number.timeAccuracy !== TimeAccuracy.Minute) {
            dateFormattingOptions.second = '2-digit'
            if (number.timeAccuracy !== TimeAccuracy.Second) {
              dateFormattingOptions.fractionalSecondDigits = 3
            }
          }
        }
      }
      string = Intl.DateTimeFormat(LOCALE, dateFormattingOptions).format(dateObj)
    }
  } else if (formatting) {
    if (formatting.kind === Formatting.Unit) {
      let formattingNormalUnit = formatting.original
      let conversion = formatting.conversion
      if (!formattingNormalUnit) {
        [formattingNormalUnit, conversion] = formatUnit(formatting.unit)
      }
      const originalNumber = number.value
      number.value = conversion.to(number.value)
      if (number.unit) {
        const [numberNormalUnit, conversionBase] = formatUnit(number.unit)
        number.value = conversionBase.from(number.value)
        if (numberNormalUnit !== formattingNormalUnit) {
          let converted = fromToUnits(conversionBase.from(originalNumber), numberNormalUnit, formattingNormalUnit)
          if (!converted) {
            console.warn(`${numberNormalUnit} cannot be converted to ${formattingNormalUnit}`)
            converted = number.value
          }
          number.value = converted
        }
      }
      if (typeof formatting.unit === 'string' && Object.values(ISO4217Currency).includes(
        // @ts-ignore
        formatting.unit
      )) {
        string = Intl.NumberFormat(LOCALE, {
          currency: formatting.unit,
          currencyDisplay: 'symbol',
          style: 'currency',
          minimumFractionDigits: number.value.isInt() ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(number.value.toNumber())
      } else if (typeof formatting.unit === 'string' && formatting.unit in unitsConversions.duration) {
        string = formatPureNumber(number.value) + formattingNormalUnit
      } else {
        string = formatPureNumber(number.value) + ' ' + formattingNormalUnit
      }
    } else if (formatting.kind === Formatting.Pure) {
      if ('originalUnit' in number && number.originalUnit) {
        const [_, conversionBase] = formatUnit(number.originalUnit)
        number.value = conversionBase.to(number.value)
      }
      string = formatPureNumber(number.value)
      if (formatting.thousandsSeparator === false) {
        string = string.replaceAll(',', '')
      }
    } else if (formatting.kind === Formatting.NonInt) {
      if ('originalUnit' in number && number.originalUnit) {
        const [_, conversionBase] = formatUnit(number.originalUnit)
        number.value = conversionBase.to(number.value)
      }
      string = formatPureNumber(number.value, formatting.format, {
        to: formatting.relativeTo,
        over: formatting.relativeOver
      })
    } else string = ''
  } else if ((number as PercentageToken).isPercentage) {
    string = formatPureNumber(number.value, NonIntFormat.Percent)
  } else if (typeof number.unit === 'string' && Object.values(ISO4217Currency).includes(
    // @ts-ignore
    number.unit
  )) {
    if ('originalUnit' in number && typeof number.originalUnit === 'string') {
      const exchangeRate = getExchangeRate()?.currentRate(number.unit as ISO4217Currency, number.originalUnit as ISO4217Currency) ?? Decimal(1)
      number.value = number.value.mul(exchangeRate)
      number.unit = number.originalUnit
      delete (number as Partial<NormalizedToken>).originalUnit
    }
    string = Intl.NumberFormat(LOCALE, {
      currency: number.unit as string,
      currencyDisplay: 'symbol',
      style: 'currency',
      minimumFractionDigits: number.value.isInt() ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(number.value.toNumber())
  } else if (typeof number.unit === 'string' && number.unit in unitsConversions.duration) {
    const duration: Partial<Record<Intl.DurationFormatUnit, number>> = {}
    let seconds = (unitsConversions.duration[number.unit as keyof typeof unitsConversions.duration] as Conversion)
      .from(number.value)
    let value = unitsConversions.duration.millisecond.to(seconds)
    duration.milliseconds = value.mod(1000).toNumber()
    value = value.div(1000).floor()
    duration.seconds = value.mod(60).toNumber()
    value = value.div(60).floor()
    duration.minutes = value.mod(60).toNumber()
    value = value.div(60).floor()
    duration.hours = value.mod(24).toNumber()
    value = value.div(24).floor()
    duration.days = value.mod(7).toNumber()
    duration.weeks = value.div(7).floor().toNumber()
    string = new Intl.DurationFormat(LOCALE, {style: 'narrow'}).format(duration)
    string ||= '0d'
  } else if ('numbers' in number) {
    string = (number as MultiUnitToken).numbers.map(number => formatNumber(number)).join(' ')
  } else {
    let unitString: string = null!
    if ('originalUnit' in number && number.originalUnit) {
      const [us, conversion] = formatUnit(number.originalUnit, false)
      unitString = us
      number.value = conversion.to(number.value)
      const [_, conversionBase] = formatUnit(number.unit)
      number.value = conversionBase.from(number.value)
    } else if (number.unit) {
      const [us] = formatUnit(number.unit)
      unitString = us
    }
    string = formatPureNumber(number.value)
    if (unitString) {
      if (/\p{L}/u.test(unitString)) {
        string += ' ' + unitString
      } else {
        string += unitString
      }
    }
  }
  return string
}

function formatPureNumber(number: Decimal, as: NonIntFormat = NonIntFormat.Decimal, relative?: {
  to: Decimal,
  over: Decimal
}): string {
  if (as === NonIntFormat.Percent) {
    if (relative?.to) {
      number = number.div(relative.to)
    } else if (relative?.over) {
      number = number.sub(relative.over).div(relative.over)
    }
    return Intl.NumberFormat(LOCALE, {
      style: 'percent',
      maximumFractionDigits: 9
    }).format(number.toNumber())
  } else if (as === NonIntFormat.Fraction) {
    const unlimitedFraction = number.toFraction()
    if (unlimitedFraction[1].toString().length >= 6) {
      return '~' + number.toFraction(100_000).join('/')
    } else {
      return unlimitedFraction.join('/')
    }
  } else if (as === NonIntFormat.Multiplier) {
    if (relative?.to) {
      number = number.div(relative.to)
    } else if (relative?.over) {
      number = number.sub(relative.over).div(relative.over)
    }
    return formatPureNumber(number) + 'x'
  } else {
    // as === NonIntFormat.Decimal
    return Intl.NumberFormat(LOCALE, {
      maximumFractionDigits: 9,
      notation: number.e >= 12 ? 'scientific' : 'standard',
    }).format(number.toNumber())
  }
}
