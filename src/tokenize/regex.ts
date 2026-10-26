import {EquationShape, Formatting, Operator} from './types'
import {
  arbitraryUnit,
  d,
  durationUnit,
  formattingKeywords,
  n,
  np,
  nw,
  percentageUnit,
  pn,
  scout,
  timeZoneRegex,
  trimOptionalSpace
} from './base'

const operatorsRegex = {
  [Operator.Sum]: scout(({n, np, pn, l, d}) => `(?:${n(11)}(\\+|plus)${n(21)}|(sum|total)( of)?${l(22)}|${pn(23)}(?<u23>${percentageUnit.source})? on${n(13)})|${d(24)} (after|from) ${np(14)}`),
  // this first match is for pre-parsed dates
  // todo |${n(25)} to ${n(15)} without interfering with "<n> to 5 digits" or "<n> to 2 dp"
  [Operator.Subtract]: scout(({n, np, pn, d}) => `(?:${np(24)} (to|-) ${np(14)}|${n(11)}(-|\u2212|minus|subtract)${n(21, true)}|${pn(22)}(?<u22>${percentageUnit.source})? off${n(12)})|${d(24)} before ${np(14)}`),
  [Operator.Multiply]: scout(({n, pn}) => `(?:${n(11)}(×|times|\\*|multiplied by)${n(21, true)}|${pn(22)}(?<u22>${percentageUnit.source})? of${n(12)})`),
  [Operator.Divide]: scout(({n}) => `${n(1)}(÷|\/|:|over|divided by)${n(2, true)}`),
  [Operator.Power]: scout(({n}) => `${n(1)}(?:(\\*\\*|^|power|to the(?: power of)?)${n(21, true)}|to ${trimOptionalSpace(n(22))}(?:st|nd|rd|th)? power)`),
  [Operator.Modulo]: scout(({n}) => `(?:${n(11)}(%|mod)${n(21, true)}|remainder of${n(12)}divided by${n(22, true)})`),
  [Operator.Factorial]: scout(({n}) => `${n(1)}(!|fact(orial)?)`),
  [Operator.Absolute]: scout(({n}) => `(abs(olute)?)( of)?${n(1, true)}`),
  [Operator.Round]: scout(({n, pn}) => `${n(1)}(?:rounded(?! down| up)( to nearest${pn(21)})?|to nearest${pn(22)}|to${pn(3)}(?:dp|decimal(?: points?)?|digits?))`),
  [Operator.Floor]: scout(({n, pn}) => `${n(1)}rounded down( to nearest${pn(2)})?`),
  [Operator.Ceil]: scout(({n, pn}) => `${n(1)}rounded up( to nearest${pn(2)})?`),
  [Operator.Average]: scout(({l}) => `(avg|average|mean)( of)?${l(1)}`),
  [Operator.Median]: scout(({l}) => `(median)( of)?${l(1)}`),
  [Operator.Count]: scout(({l}) => `(count)( of)?${l(1)}`),
  [Operator.Root]: scout(({n}) => `(((?<n11>square|cube) root)|root ${n(12)})( of)?${n(2, true)}`),
  [Operator.Logarithm]: scout(({n}) => `(log(arithm)?${n(1)})(\\s*(of|base)${n(2, true)})?`),
  [Operator.Min]: scout(({l}) => `(smaller|lesser)( of)?${l(1)}`),
  [Operator.Max]: scout(({l}) => `(larger|greater)( of)?${l(1)}`),
  [Operator.Mid]: scout(({n}) => `(midpoint( between)?${n(1)}(and|&|,| )${n(21, true)}|half( of)?${n(22, true)})`),
  [Operator.Random]: scout(({n}) => `random( number)? between${n(1)}(and|&|,| )${n(2, true)}`),
  [Operator.GCD]: scout(({n}) => `(gc[df]|greatest common (divisor|factor))( of)?${n(1)}(and|&|,| )${n(2, true)}`),
  [Operator.LCM]: scout(({n}) => `([ls]cm|(least|lowest|smallest) common multiple)( of)?${n(1)}(and|&|,| )${n(2, true)}`),
  [Operator.Permutation]: scout(({n}) => `(${n(11)}permutation${n(21)}|${n(22)}permutations of${n(12)})`),
  [Operator.Combination]: scout(({n}) => `(${n(11)}combination${n(21)}|${n(22)}combinations of${n(12)})`),
  [Operator.Clamp]: scout(({n}) => `clamp${n(1)}(between${n(21)}(and|&|,| )${n(31, true)}|from${n(22)}to${n(32, true)}|${n(23)}(and|&|,| )${n(33, true)})`),
  [Operator.CalendarWeek]: scout(({np}) => `(week of year|w/c|calendar week|CW|week number)(( o[nf])? ${np(1)})?`),
} satisfies { [K in Operator]: [RegExp, RegExp] }

for (const operator in operatorsRegex) {
  let [, matcher] = operatorsRegex[operator as keyof typeof operatorsRegex]
  let source = matcher.source
  source = source.replaceAll(' ', '\\s+')
  source = trimOptionalSpace(source)
  operatorsRegex[operator as keyof typeof operatorsRegex][1] = new RegExp(source, 'iu')
}

export {operatorsRegex}

export const operatorFuncNames = {
  [Operator.Sum]: ['add', 'sum', 'total'],
  [Operator.Subtract]: ['sub', 'subtract'],
  [Operator.Multiply]: ['mul', 'multiply'],
  [Operator.Divide]: ['div', 'divide'],
  [Operator.Power]: ['pow', 'power'],
  [Operator.Modulo]: ['mod', 'modulo'],
  [Operator.Factorial]: ['fact', 'factorial'],
  [Operator.Absolute]: ['abs'],
  [Operator.Round]: ['round'],
  [Operator.Floor]: ['floor'],
  [Operator.Ceil]: ['ceil'],
  [Operator.Average]: ['avg', 'average', 'mean'],
  [Operator.Median]: ['median'],
  [Operator.Count]: ['count'],
  [Operator.Root]: ['root', ['sqrt', 'square', '$0'], ['cbrt', 'cube', '$0']],
  [Operator.Logarithm]: ['logarithm', 'log'], // todo
  [Operator.Min]: ['min'],
  [Operator.Max]: ['max'],
  [Operator.Mid]: ['mid', 'midpoint', 'half'],
  [Operator.Random]: ['random', 'rnd'],
  [Operator.GCD]: ['gcd'],
  [Operator.LCM]: ['lcm'],
  [Operator.Permutation]: ['permutation'],
  [Operator.Combination]: ['combination'],
  [Operator.Clamp]: ['clamp'],
  [Operator.CalendarWeek]: ['cw'],
  // todo trigonometry: sin cos tan sinh etc
} satisfies { [K in Operator]: (string | string[])[] }

// does not apply to function call syntax -> treated like brackets
export const orderOfOperations: Operator[][] = [
  [Operator.CalendarWeek],
  [Operator.Absolute, Operator.Power, Operator.Root, Operator.Logarithm, Operator.Random, Operator.Factorial],
  [Operator.Modulo, Operator.Divide, Operator.Multiply],
  [Operator.Sum, Operator.Subtract],
  [Operator.Round, Operator.Floor, Operator.Ceil],
  [Operator.Average, Operator.Median, Operator.Count, Operator.Min, Operator.Max, Operator.Mid, Operator.GCD, Operator.LCM, Operator.Permutation, Operator.Combination, Operator.Clamp],
]

const ofRelative = (l: string) => `(?<relof_${l}>\\s+of${pn(('relof_' + l) as unknown as number)})?`
const onRelative = (l: string) => `(?<relon_${l}>\\s+on${pn(('relon_' + l) as unknown as number)})?`
const relative = (l: string) => `(?:${ofRelative(l)}|${onRelative(l)})`
export const formattingRegex = {
  [Formatting.Unit]: new RegExp(`(?:${n(1)})(?:in|as|to)\\s+(?!${formattingKeywords.join('|')})(?<unit>${arbitraryUnit.source})\\s*$`, 'u'),
  [Formatting.Pure]: new RegExp(`(?:${n(1)})(?:as|to)\\s+number\\s*$`, 'u'),
  [Formatting.NonInt]: new RegExp(`(?:${n(1)})(?:as|to)\\s+(?:a\\s+)?(?<format>(?<f_percent>(?:percent(age)?|%)${relative('percent')})|(?<f_multiplier>(?:multiplier|[Xx])${relative('multiplier')})|(?<f_fraction>fraction)|(?<f_decimal>dec(imal)?))\\s*$`, 'u'),
}

export const equationRegex = {
  [EquationShape.CrossMul]: new RegExp(`^(?:${nw(11)}is\\s+to${nw(21)}as${nw(31)}is\\s+to${nw(41)}|${nw(12)}to${nw(22)}is${nw(32)}to${nw(42)})$`, 'u'),
  [EquationShape.Standard]: new RegExp(`^([\\s\\S]+?)\\s+(?:is|equals|is\\s+equal\\s+to|=)\\s+([\\s\\S]+?)$`, 'u'),
}

const temporalRegex = {
  'Ago': new RegExp(`${d(1)} ago`),
  'Since': new RegExp(`(?<u>${durationUnit.source}) since ${np(1)}`),
  'Till': new RegExp(`(?<u>${durationUnit.source}) (till|until) ${np(1)}`),
  'Between': new RegExp(`(?<u1>${durationUnit.source}) ((in )?between|from) ${np(11)} (and|&|to) ${np(21)}|${np(15)} (to|-) ${np(25)} in (?<u5>${durationUnit.source})|${np(12)} through ${np(22)} in (?<u2>${durationUnit.source})|(?<u3>${durationUnit.source}) in ${np(13)}|${np(14)} in (?<u4>${durationUnit.source})`),
  'TimeInZone': new RegExp(`(?<t1>time|date) in ${timeZoneRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$11>`)}|${timeZoneRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$12>`)} (?<t2>time|date)`),
  'TimezoneDifference': new RegExp(`(?:time )?diff(?:erence)? between ${timeZoneRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$11>`)} (and|&) ${timeZoneRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$12>`)}`),
  'CurrentUnix': new RegExp(`current (timestamp|unix|epoch)`),

  'TimezoneConversion': new RegExp(`${np(11)} (in|to) ${timeZoneRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$11>`)}|time in ${timeZoneRegex.source.replace(/\(\?<([a-zA-Z]+)>/g, `(?<$12>`)} when (it is|it'?s) ${np(12)}`),
}

for (const operator in temporalRegex) {
  let source = temporalRegex[operator as keyof typeof temporalRegex].source
  source = source.replaceAll(' ', '\\s+')
  source = trimOptionalSpace(source)
  temporalRegex[operator as keyof typeof temporalRegex] = new RegExp(source, 'i')
}

export {temporalRegex}
