import Decimal from 'decimal.js'
import {c, Conversion, siC, siMultiples, siMultiplesExponents} from './base'

const gregorianMonth = Decimal(2_629_746) // average of full 400a cycle
const siMile = Decimal(1609.344)
const impGallon = Decimal(4.54609).div(1000)
const usIn3 = siMile.div(1760).div(3).div(12).pow(3)
const usGallon = usIn3.mul(231)
export const unitsConversions = {
  duration: {
    ...siC('second'),
    'minute': c(Decimal(60)),
    'hour': c(Decimal(60).mul(60)),
    'day': c(Decimal(60).mul(60).mul(24)),
    'week': c(Decimal(60).mul(60).mul(24).mul(7)),
    'fortnight': c(Decimal(60).mul(60).mul(24).mul(14)),
    'month': c(gregorianMonth),
    'semester': c(gregorianMonth.mul(6)),
    'year': c(gregorianMonth.mul(12)),
    'decade': c(gregorianMonth.mul(12).mul(10)),
    'century': c(gregorianMonth.mul(12).mul(100)),
  },
  length: {
    ...siC('meter'),
    'angstrom': c(Decimal.pow(10, -10)),
    'furlong': c(siMile.div(8)),
    'mile': c(siMile),
    'yard': c(siMile.div(1760)),
    'foot': c(siMile.div(1760).div(3)),
    'inch': c(siMile.div(1760).div(3).div(12)),
    'fathom': c(Decimal(1.8288)),
    'nautical miles': c(Decimal(1_852)),
    'light year': c(Decimal('9_460_730_472_580_800')),
  },
  area: {
    ...siC('meter', 'square ', (factor: Decimal) => factor.pow(2)),
    'square mile': c(siMile.pow(2)),
    'square yard': c(siMile.div(1760).pow(2)),
    'square foot': c(siMile.div(1760).div(3).pow(2)),
    'square inch': c(siMile.div(1760).div(3).div(12).pow(2)),
    'hectare': c(Decimal(10_000)),
    'acre': c(siMile.pow(2).div(640)),
  },
  volume: {
    ...siC('liter', undefined, (factor: Decimal) => factor.div(100)),
    ...siC('meter', 'cubic ', (factor: Decimal) => factor.pow(3)),
    'tablespoon': c(Decimal(0.015).div(1000)), // metric
    'teaspoon': c(Decimal(0.005).div(1000)), // metric
    'cubic mile': c(siMile.pow(3)),
    'cubic yard': c(siMile.div(1760).pow(3)),
    'cubic foot': c(siMile.div(1760).div(3).pow(3)),
    'cubic inch': c(siMile.div(1760).div(3).div(12).pow(3)),
    'gallon': c(impGallon), // imperial
    'quart': c(impGallon.div(4)),
    'fluid ounces': c(impGallon.div(160)),
    'US gallon': c(usGallon),
    'US quart': c(usGallon.div(4)),
    'US fluid ounces': c(usGallon.div(128)),
    'US tablespoon': c(usGallon.div(128).div(2)),
    'US teaspoon': c(usGallon.div(128).div(6)),
    'cup': c(usGallon.div(16)),
    'pints': c(usGallon.div(8)),
  },
  mass: {
    ...siC('gram'),
    'ton': c(Decimal(1000)), // metric
    'ounce': c(Decimal(28.349523125)),
    'pound': c(Decimal(28.349523125).mul(16)),
    'stone': c(Decimal(28.349523125).mul(14)),
    'short ton': c(Decimal(28.349523125).mul(16).mul(2000)),
    'carat': c(Decimal(0.2)),
  },
  velocity: {
    // other velocity units are seen as composite units
    // "default" (1) is default length (meter) / default time (second)
    'knot': c(Decimal(1_852 /* 1 nautical miles = 1_852 meter */).div(60).div(60)),
  },
  angle: {
    'turn': c(Decimal(360)),
    'degree': c(Decimal(1)),
    'arcminute': c(Decimal(1).div(60)),
    'arcsecond': c(Decimal(1).div(60).div(60)),
    'milliarcsecond': c(Decimal(1).div(60).div(60).div(1000)),
    'microarcsecond': c(Decimal(1).div(60).div(60).div(1000).div(1000)),
    'gradian': c(Decimal(1).div(10).mul(9)),
    'radian': c(Decimal.div(Math.PI, 180)),
    'milliradian': c(Decimal.div(Math.PI, 180).div(1000)),
  },
  temperature: {
    'kelvin': c(k => k.sub(273.15), c => c.add(273.15)),
    'celsius': c(Decimal(1)),
    'fahrenheit': c((f) => f.sub(32).div(1.8), (c) => c.mul(1.8).add(32)),
  },
  current: {
    ...siC('ampere')
  },
  data: {
    'bit': c(Decimal(1)),
    ...Object.fromEntries(siMultiples.slice(2).map((prefix, i) =>
      [prefix + 'bit', c(Decimal.pow(1000, Decimal.div(siMultiplesExponents[i + 2], 3)))]
    )),
    'byte': c(Decimal(8)),
    ...Object.fromEntries(siMultiples.slice(2).map((prefix, i) =>
      [prefix + 'byte', c(Decimal.pow(1000, Decimal.div(siMultiplesExponents[i + 2], 3)).mul(8))]
    )),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix, i) =>
      [prefix + 'bit', c(Decimal.pow(1024, Decimal.div(siMultiplesExponents[i + 2], 3)))]
    )),
    ...Object.fromEntries(['kibi', 'mebi', 'gibi', 'tebi', 'pebi'].map((prefix, i) =>
      [prefix + 'byte', c(Decimal.pow(1024, Decimal.div(siMultiplesExponents[i + 2], 3)).mul(8))]
    )),
  },
} satisfies Record<string, Record<string, Conversion>>
