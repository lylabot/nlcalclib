import {describe, it} from 'node:test'
import {evaluate} from './src'
import * as assert from 'node:assert'
import {ExchangeRate} from './src/units/exchange-rate'
import {ISO4217Currency} from './src/units/definitions/currency'
import Decimal from 'decimal.js'
import {LOCALE} from './src/tokenize/base'

const results: { [key: string]: string | ((result: string) => boolean | string) } = {
  '': '',
  '   ': '',
  'just some words without numbers': '',
  '10 +': '10',
  '+++10---2': '8',
  '100 + ( )': '100',
  '# this is just a comment line': '',
  '100 # inline comment text': '100',

  '10Km + 500M in cM': '1,050,000 cm',
  '1 dollar + 50 cents + 2 quarters': '2\u00A0US$',
  '10m/s/s * 5s': '50 m/s',
  '1,0,0,0': '1,000',
  '1.2.3.4 + 5': (result) => result === '5' || result === 'NaN',
  '10 000 000 + 5 000': '10,005,000',
  '999999999999999999999999999999 + 1': '1e+30',

  '10 divided by 0': '∞',
  '0 divided by 0': 'NaN',
  'square root of -9': '3i',
  'log 0': '-Infinity',
  '100% of 0': '0',
  '0% off 0': '0',
  'what % of 0 is 10': 'Infinity',
  '5 is to 0 as 10 is to what': '0',

  '1,00': '1',
  '1,000': '1,000',
  '1.00': '1',
  '1.000': '1',
  '1.00,00': '100',
  '1,00.00': '100',

  '30 plus 20': '50',
  '4 -2': '2',
  '3 − 42': '-39',
  '3,000 minus 12': '2,988',
  '3 multiplied by 4': '12',
  '3 times 4': '12',
  '1,000 divided by 200': '5',
  '1km - 400m': '600 m',
  '60km divided by 30min': '2 km/min',
  '3 to the power of 2': '9',
  'remainder of 21 divided by 5': '1',
  'one hundred and twenty three plus forty five': '168',
  'two point five times four': '10',
  'two point seven three times four': '10.92',
  'negative three hundred minus twelve': '-312',
  'a million divided by two thousand': '500',
  'three quarters of a hundred': '75',
  'a third of 90': '30',
  'double 45': '90',
  'triple 3.5': '10.5',
  '3 * (8 + 9)': '51',
  '3 * 8 + 9 * 3': '51',
  '3 * round(8 / 9)': '3',
  'five hundred and six divided by forty two rounded': '12',
  '3!': '6',
  '7 fact': '5,040',
  '0.001km': '0.001 km',
  '3.6km/h in m/s': '1 m/s',
  '2N / 4 kg': '0.5 m/s²',
  '0.5 m/s * 4kg/s': '2 N',
  '1/50ms in Hz': '20 Hz',
  '60bpm as Hz': '1 Hz',
  '10c to f': '50 °F',
  '14f to c': '-10 °C',
  '6894.757293168 Pa in psi': '1 psi',
  '1 psi in Pa': '6,894.757293168 Pa',
  '4.184 Ws in cal': '1 cal',
  'square root of (remainder of 21 divided by 5 plus 8)': '3',
  'average of 10, count(4, 5, 6), and 3 to the power of 2': '7.333333333',
  'half of 10% of 200': '10',
  '10% off (200 + 10% on 100)': '279',
  '20 to the power of (3 minus 1)': '400',
  'midpoint between (100 + 50) and (400 / 2)': '175',
  'half of 2': '1',

  '10 GB + 500 MB in GB': '10.5 GB',
  '1 hour 15 minutes + 45 minutes': '2h',
  '2 square meters + 500 square centimeters': '2.05 m²',
  '80 mph in km/h': '128.74752 km/h',

  'total income: $4,500 rent + $600 food': '5,100\u00A0US$',
  '$25 per hour * 14 hours of work': '350\u00A0US$',
  '100 + 50 (bonus payment)': '150',
  'interest on $5,000 after 5 years at 5%': '1,250\u00A0US$',
  'what is 45 plus 55 please?': '100',
  'price was 100 EUR, now 20% off': '80\u00A0EUR',

  '1, 2': '1, 2', // lists
  'add(1, 2)': '3',
  'count(1, 2, 3)': '3',
  'pow(sqrt(2), 2)': '2',
  'fact(4)': '24',

  '1/3 to 2 dp': '0.33',
  'π to 5 digits': '3.14159',
  '5.5 rounded': '6',
  '5.5rounded': '6',
  '5.5 rounded up': '6',
  '37 to nearest 10': '40',
  '$490 rounded to nearest hundred': '500\u00A0US$',
  '2,100 to nearest thousand': '2,000',
  '21 rounded up to nearest 5': '25',
  '17 rounded down to nearest 3': '15',

  'total of 3, 4, 7 and 9': '23',
  'average of 36, 42, 19 and 81': '44.5',
  'count of 1, 2, 3, 4, 5': '5',
  'median of 10, 20 and 30': '20',
  'median of 10, 20, 30, 40': '25',

  'square root of 81': '9',
  'cube root of 27': '3',
  'root 5 of 100': '2.511886432',
  'log 20 base 4': '2.160964047',
  '81 is 9 to what power': '2',
  '27 is 3 to the what': '3',
  '9 is 3 to the power of what': '2',
  '9 equals what to the power of 2': '3',

  'π': '3.141592654',
  'Pi': '3.141592654',
  'Tau': '6.283185307',
  'Phi': '1.618033989',

  '$100 as number': '100',
  '40/day to decimal': '40',
  '20% as dec': '0.2',
  '6 is to 60 as 8 is to what': '80',
  '5 is to 10 as what is to 80': '40',
  '5 km is to 500m as 5 cm is to what': '0.005 m',
  '30 minutes is to 3 hours as what is to 60 seconds': '10s',
  '30 minutes is to what as 3 hours is to 60 seconds': '10s',
  'larger of 100 and 200': '200',
  'greater of 100 and 200': '200',
  'smaller of 5 and 10': '5',
  'lesser of 5 and 10': '5',
  'half of 175': '87.5',
  'midpoint between 150 and 300': '225',
  'midpoint between 300 and 150': '225',
  'random number between 1 and 10': (result) => Number(result) <= 10 && Number(result) >= 1,
  'random number between 0 and 1': (result) => Number(result) <= 1 && Number(result) >= 0,
  'gcd of 20 and 30': '10',
  'lcm of 5 and 8': '40',
  '10 permutation 3': '720',
  '25 combination 3': '2,300',
  '3 permutations of 10': '720',
  '3 combinations of 25': '2,300',
  'clamp 26 between 5 and 25': '25',
  'clamp 4 from 5 to 25': '5',

  '10% of 200': '20',
  'ten percent of two hundred': '20',
  '25% × 200': '50',
  '200 + 10%': '220',
  '10% on 200': '220',
  '200 - 10%': '180',
  '10% off 200': '180',
  '20 is 10% of what': '200',
  '180 is 10% off what': '200',
  '220 is 10% on what': '200',
  // '50 to 75 is what %': '50%',
  // '40 to 90 as %': '125%',
  '180 is what % off 200': '10%',
  '180 is what % on 150': '20%',
  '20 is what % of 200': '10%',
  '20 as a % of 200': '10%',
  '20/200 as %': '10%',
  '0.35 as %': '35%',
  '2/5 as percent': '40%',
  '10% + 20%': '30%',
  '90% − 40%': '50%',
  '30% + 0.4': '70%',
  '100% - 1/2': '50%',
  '100% + 2 + 30%': '330%',
  '50% × 30': '15',
  '30 × 50%': '15',
  '2/10 as fraction': '1/5',
  '50% as fraction': '1/2',
  '2/3 of 600': '400',
  '50 is 1/5 of what': '250',
  '20/5 as multiplier': '4x',
  '50 as x of 5': '10x',
  '2 as multiplier of 1': '2x',
  '2 as multiplier on 1': '1x',
  // '1 as x off 2': '0.5x',
  // '50 to 75 is what x': '1.5x',
  // '20 to 40 as x': '2x',

  '10 June + 3 weeks': '1 July',
  'April 1, 2019 - 3 months 5 days': '27 December 2018',
  '12/02/1988 + 32 years': '12 February 2020',
  '01.05.2005 + 3 years 2 months 3 weeks': '22 July 2008',
  '3 weeks after March 14, 2019': '4 April 2019',
  '28 days before March 12': '12 February',
  '2 months 3 days after June 5': '8 August',
  'yesterday - 8 weeks 3 days': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0}).add({days: -1}).add({days: -3, weeks: -8})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'Yesterday + 1 week': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0}).add({days: -1}).add({weeks: 1})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'Yesterday + 1 megasecond': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0}).add({days: -1}).add({seconds: 1_000_000})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'today + 3 weeks': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0}).add({weeks: 3})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'tomorrow + 3 weeks': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0}).add({days: 1}).add({weeks: 3})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'now - 1 month': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC').add({months: -1})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'today at 2 - 30 minutes': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 2, minute: 0, second: 0, millisecond: 0, nanosecond: 0})
      .add({minutes: -30})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})
  },
  '4 days from now': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC').add({days: 4})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  '3 days ago': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC').add({days: -3})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'January 10 - February 5': '3w 5d',
  '3 March to 30 May': '12w 4d',
  'days since July 15': () => {
    const duration = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0})
      .since(`${new Date().getUTCFullYear()}-07-15T00:00:00[UTC]`)
    return Math.round(duration.total('days')) + 'd'
  },
  'days till December 25': () => {
    const duration = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 0, minute: 0, second: 0, millisecond: 0, nanosecond: 0})
      .until(`${new Date().getUTCFullYear()}-12-25T00:00:00[UTC]`)
    return Math.round(duration.total('days')) + 'd'
  },
  'days between 3 March and 30 May': '88d',
  // '1978 to 2021': '43y', // this is difficult cause these could also just be meant as numbers
  'April 1 through April 30 in days': '30d',
  'week of year': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
    return String(date.weekOfYear)
  },
  'week number on march 12, 2021': '10',
  'days in Q3': '92d',
  'days in February 2020': '29d',
  '9:45 am - 15 hours 10 minutes': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 9, minute: 45, second: 0, millisecond: 0, nanosecond: 0})
      .add({hours: -15, minutes: -10})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})
  },
  '6pm Sydney in Chicago': result => result.endsWith(' at 02 GMT-5'),
  '2am PST to GMT': result => result.endsWith(' at 09 GMT'),
  '3pm GMT+8 to Paris': result => result.endsWith(' at 09 GMT+2'),
  'time in Tokyo when it is 9am in London': result => result.endsWith(' at 17 GMT+9'),
  'Monday 9am Delhi in new york': result => result.endsWith(' at 23:30 GMT-4'),
  // '7:30am LAX to Japan': '',
  'time in Paris': () => {
    const date = Temporal.Now.zonedDateTimeISO('+02:00')
    return date.toLocaleString(LOCALE, {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortGeneric'
    })
  },
  'Tokyo time': () => {
    const date = Temporal.Now.zonedDateTimeISO('+09:00')
    return date.toLocaleString(LOCALE, {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortGeneric'
    })
  },
  'time in Thailand': () => {
    const date = Temporal.Now.zonedDateTimeISO('+07:00')
    return date.toLocaleString(LOCALE, {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortGeneric'
    })
  },
  'date in Vancouver': () => {
    const date = Temporal.Now.zonedDateTimeISO('-07:00')
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'time difference between Seattle and Moscow': '10h',
  // 'difference between PDT & AEST': '17h',
  'April 1, 2019 3:30pm as iso': '2019-04-01T15:30:00.000Z',
  '2019-04-01T15:30:00 to date': '1 April 2019 at 15:30:00',
  '2019-04-01T12:34:56.789 to date': '1 April 2019 at 12:34:56.789',
  'April 1, 2019 to timestamp': '1554076800',
  '1559740303.48 to date': '5 June 2019 at 13:11:43',
  'current timestamp': (result) => Decimal(Date.now()).div(1000).sub(result).lt(0.1),
  '1733823083000 to date': '10 December 2024 at 09:31:23.000',
  'January 30, 2020 + 1 month': '29 February 2020',
  'March 31 + 1 month': '30 April',
  '11:30 pm + 90 mins': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC')
      .with({hour: 23, minute: 30, second: 0, millisecond: 0, nanosecond: 0})
      .add({minutes: 90})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})
  },
  '7:45 am to 4:20 pm in hours': '8.583333333h',
  '4.5 months from now': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC').add({seconds: Decimal(2_629_746).mul(4.5).toNumber()})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'now - 4.5 months': () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC').add({seconds: Decimal(2_629_746).mul(4.5).mul(-1).toNumber()})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'now * 3 seconds': 'Error',
  'now + 10%': 'Error',
  'now - 10%': 'Error',
  // expecting overflow in date parsing
  'February 30, 2026 + 1 day': '3 March 2026',
  '11:59:59 pm + 1 second': (result) => result.includes('00:00'),
  'today - today': '0d',
  'Friday + 3 days': () => {
    const now = Temporal.Now.zonedDateTimeISO('UTC')
    const date = now.add({days: 5 - now.dayOfWeek}).add({days: 3})
    return date.toLocaleString(LOCALE, {month: 'long', day: 'numeric'})
  },
  'days in February 2100': '28d',
}

describe('Should evaluate correctly', () => {
  for (const expression in results) {
    it(expression, () => {
      if (typeof results[expression as keyof typeof results] === 'function') {
        const actual = evaluate(expression)
        // @ts-ignore
        const expected = results[expression as keyof typeof results](actual)
        if (typeof expected === 'string') {
          assert.equal(actual, expected)
        } else {
          assert.ok(expected, `Invalid output: "${actual}"`)
        }
      } else {
        const result = evaluate(expression)
        assert.strictEqual(result, results[expression as keyof typeof results],
          `Expected \`${results[expression as keyof typeof results]}\` for expression \`${expression}\`, got \`${result}\``)
      }
    })
  }
})

describe('Random', () => {
  it('should match range', () => {
    const start = 12, end = 48;
    const threshold = .2;
    const numbers = Array(1000).fill(0)
      .map(() => evaluate(`random number between ${start} and ${end}`))
      .map(Number)
      .sort()
    assert.ok((numbers.at(0) as number) >= start, 'smallest is less than start')
    assert.ok((numbers.at(0) as number) <= (start + threshold), 'smallest not close to start')
    assert.ok((numbers.at(-1) as number) <= end, 'greatest is greater than end')
    assert.ok((numbers.at(-1) as number) >= (end - threshold), 'greatest not close to end')
  })
})

export class StatixExchangeRate extends ExchangeRate {
  cache: Record<string, number>

  constructor() {
    super()
    this.cache = {
      "USD": 1,
      "AED": 3.6725,
      "AFN": 64.842196,
      "ALL": 81.995825,
      "AMD": 362.52543,
      "ANG": 1.79,
      "AOA": 922.256598,
      "ARS": 1523.0868,
      "AUD": 1.439269,
      "AWG": 1.79,
      "AZN": 1.703271,
      "BAM": 1.73839,
      "BBD": 2,
      "BDT": 123.136994,
      "BGN": 1.73839,
      "BHD": 0.376,
      "BIF": 2993.760108,
      "BMD": 1,
      "BND": 1.279594,
      "BOB": 12.059191,
      "BRL": 5.222532,
      "BSD": 1,
      "BTN": 96.434512,
      "BWP": 13.985808,
      "BYN": 3.025287,
      "BZD": 2,
      "CAD": 1.42482,
      "CDF": 2314.211788,
      "CHF": 0.828414,
      "CLF": 0.024996,
      "CLP": 987.993764,
      "CNH": 6.705774,
      "CNY": 6.710363,
      "COP": 3308.762446,
      "CRC": 458.947847,
      "CUP": 24,
      "CVE": 98.006238,
      "CZK": 21.732999,
      "DJF": 177.721,
      "DKK": 6.647422,
      "DOP": 60.165018,
      "DZD": 134.191294,
      "EGP": 52.24751,
      "ERN": 15,
      "ETB": 161.513278,
      "EUR": 0.88889,
      "FJD": 2.230347,
      "FKP": 0.755692,
      "FOK": 6.641471,
      "GBP": 0.755727,
      "GEL": 2.598045,
      "GGP": 0.755692,
      "GHS": 11.617322,
      "GIP": 0.755692,
      "GMD": 74.412639,
      "GNF": 8794.493632,
      "GTQ": 7.663332,
      "GYD": 209.136685,
      "HKD": 7.847568,
      "HNL": 26.89948,
      "HRK": 6.696848,
      "HTG": 130.926686,
      "HUF": 327.670229,
      "IDR": 17915.058935,
      "ILS": 3.044838,
      "IMP": 0.755692,
      "INR": 96.400634,
      "IQD": 1310.78161,
      "IRR": 1480223.722823,
      "ISK": 121.900419,
      "JEP": 0.755692,
      "JMD": 158.769764,
      "JOD": 0.709,
      "JPY": 157.730309,
      "KES": 129.58156,
      "KGS": 87.467727,
      "KHR": 4053.446838,
      "KID": 1.439267,
      "KMF": 437.273008,
      "KRW": 1344.607498,
      "KWD": 0.309182,
      "KYD": 0.833333,
      "KZT": 448.838245,
      "LAK": 22335.422433,
      "LBP": 89500,
      "LKR": 330.678444,
      "LRD": 172.073755,
      "LSL": 16.651363,
      "LYD": 6.403423,
      "MAD": 9.919494,
      "MDL": 17.807125,
      "MGA": 4458.520602,
      "MKD": 54.280014,
      "MMK": 2102.569106,
      "MNT": 3599.224213,
      "MOP": 8.083216,
      "MRU": 40.201415,
      "MUR": 48.000691,
      "MVR": 15.45683,
      "MWK": 1745.259182,
      "MXN": 18.19397,
      "MYR": 4.084534,
      "MZN": 63.838452,
      "NAD": 16.651363,
      "NGN": 1331.279356,
      "NIO": 36.83688,
      "NOK": 9.619945,
      "NPR": 154.29522,
      "NZD": 1.781308,
      "OMR": 0.384497,
      "PAB": 1,
      "PEN": 3.459326,
      "PGK": 4.534616,
      "PHP": 62.63269,
      "PKR": 277.49233,
      "PLN": 3.895505,
      "PYG": 5854.897823,
      "QAR": 3.64,
      "RON": 4.754438,
      "RSD": 104.576659,
      "RUB": 83.817169,
      "RWF": 1478.712662,
      "SAR": 3.75,
      "SBD": 7.977509,
      "SCR": 14.658669,
      "SDG": 458.581675,
      "SEK": 10.041831,
      "SGD": 1.279411,
      "SHP": 0.755692,
      "SLE": 24.654462,
      "SLL": 24654.462165,
      "SOS": 571.514264,
      "SRD": 37.664548,
      "SSP": 5653.042821,
      "STN": 21.776201,
      "SYP": 121.969716,
      "SZL": 16.651363,
      "THB": 33.566256,
      "TJS": 9.223912,
      "TMT": 3.500414,
      "TND": 2.966641,
      "TOP": 2.393282,
      "TRY": 49.161928,
      "TTD": 6.807324,
      "TVD": 1.439267,
      "TWD": 31.871674,
      "TZS": 2647.628157,
      "UAH": 45.118199,
      "UGX": 3932.951094,
      "UYU": 40.550252,
      "UZS": 11835.851216,
      "VES": 871.3689,
      "VND": 25949.123093,
      "VUV": 120.15488,
      "WST": 2.752966,
      "XAF": 583.030678,
      "XCD": 2.7,
      "XCG": 1.79,
      "XDR": 0.739537,
      "XOF": 583.030678,
      "XPF": 106.06521,
      "YER": 236.904274,
      "ZAR": 16.658578,
      "ZMW": 19.746671,
      "ZWG": 26.7653,
      "ZWL": 26.7653
    }
  }

  currentRate(from: ISO4217Currency, to: ISO4217Currency) {
    if (from in this.cache && to in this.cache) {
      return Decimal.div(this.cache[to], this.cache[from])
    } else return null
  }

  historicRate() {
    return null
  }
}

const currencyResults = {
  '1 usd in eur': '€0.89',
  '1 dkk': '1\u00A0DKK',
  '1 cad': '1\u00A0CA$',
  '1 cad in $': '0.70\u00A0US$',
  '$100k / 2%': '5,000,000\u00A0US$',
}

describe('Should evaluate correctly (currency)', () => {
  const exchangeRate = new StatixExchangeRate()
  for (const expression in currencyResults) {
    it(expression, () => {
      if (typeof currencyResults[expression as keyof typeof currencyResults] === 'function') {
        // @ts-ignore
        assert.ok(currencyResults[expression as keyof typeof currencyResults](evaluate(expression)))
      } else {
        const result = evaluate(expression, true, exchangeRate)
        assert.strictEqual(result, currencyResults[expression as keyof typeof currencyResults],
          `Expected \`${currencyResults[expression as keyof typeof currencyResults]}\` for expression \`${expression}\`, got \`${result}\``)
      }
    })
  }
})
