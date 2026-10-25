import Decimal from 'decimal.js'

const noNull = (arr: (string | null)[]) => arr.filter(item => item !== null)
const zeroWord = ['zero', 'nought']
const singleDigitNumberWords = [null, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const teenNumberWords = [null, 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const multipleOfTenWords = [null, 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const hundredWord = ['hundred']
const powerOfThousandWords = [null, 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion', 'quattuordecillion', 'quindecillion', 'sexdecillion', 'septendecillion', 'octadecillion', 'novemdecillion', 'vigintillion']
const separator = [' ', '-']

const enrichNumberWords = (match: Match) => {
  if (zeroWord.includes(match.match)) return 0
  else if (singleDigitNumberWords.includes(match.match)) return singleDigitNumberWords.indexOf(match.match)
  else if (teenNumberWords.includes(match.match)) return teenNumberWords.indexOf(match.match) + 10
  else if (multipleOfTenWords.includes(match.match)) return multipleOfTenWords.indexOf(match.match) * 10
  else if (hundredWord.includes(match.match)) return 100
  else if (powerOfThousandWords.includes(match.match)) return 1000 ** powerOfThousandWords.indexOf(match.match)
  else if (match.match === 'negative') return '-'
  else if (match.match.trim() === 'point') return '.'
  return ''
}

type MatchPriority = 'longest' | 'shortest' | 'first' | 'earliest'
type MatchingExpressionOneOf = { oneOf: MatchingExpression[], match?: MatchPriority | MatchPriority[] }
type MatchingExpressionConsecutive = { consecutive: MatchingExpression[] }
type MatchingExpressionRepeat = { repeat: MatchingExpression }
type MatchingExpression =
  string
  | ((MatchingExpressionOneOf | MatchingExpressionConsecutive | MatchingExpressionRepeat) & { optional?: boolean })
type Match = { match: string, start: number, end: number, data?: any }

const earliness = (a: Match, b: Match) => a.start - b.start
const shortness = (a: Match, b: Match) => a.match.length - b.match.length
const longness = (a: Match, b: Match) => b.match.length - a.match.length
const isOptional = (exp: MatchingExpression) => typeof exp === 'object' && 'optional' in exp && exp.optional === true

type EnrichFunc = (match: Exclude<Match, 'data'>) => Match['data']

function createMatchData(match: string, start: number, enrich?: EnrichFunc) {
  const matched: Match = {
    match, start,
    get end() {
      return this.start + this.match.length
    },
  }
  if (enrich) matched.data = enrich(matched)
  return matched
}

function matchAtPos(text: string, exp: MatchingExpression, position: number, enrich?: EnrichFunc) {
  const leadingSpaces = text.substring(position).match(/^\s+/)
  if (leadingSpaces) position += leadingSpaces[0].length
  const matched = match(text.substring(position), exp, enrich)
  if (matched === null) return null
  matched.start += position
  return matched
}

function match(text: string, exp: MatchingExpression, enrich?: EnrichFunc): Match | null {
  if (typeof exp === 'string') {
    const start = text.indexOf(exp)
    if (start !== -1) {
      return createMatchData(text.substring(start, start + exp.length), start, enrich)
    } else {
      return null
    }
  } else if ('oneOf' in exp) {
    exp.match ??= 'first'
    const matches: Match[] = []
    for (const subExp of exp.oneOf) {
      const matched = match(text, subExp, enrich)
      if (matched) {
        if (exp.match === 'first') return matched
        else matches.push(matched)
      }
    }
    if (exp.match === 'first') return null
    else {
      const matchOpt = Array.isArray(exp.match) ? exp.match : [exp.match]
      matches.sort((a, b) => {
        let score = 0, index = 0
        while (score == 0 && index < matchOpt.length) {
          if (matchOpt[index] === 'shortest') {
            score = shortness(a, b)
          } else if (matchOpt[index] === 'longest') {
            score = longness(a, b)
          } else if (matchOpt[index] === 'earliest') {
            score = earliness(a, b)
          } else score = 0
          index++
        }
        return score
      })
      return matches[0] ?? null
    }
  } else if ('consecutive' in exp) {
    let pointer = 0
    const matches: Match[] = []
    const firstSubExpNonOptional = exp.consecutive.find(subExp => !isOptional(subExp))
    const firstMatchWithoutOptional = firstSubExpNonOptional && match(text, firstSubExpNonOptional, enrich) || undefined
    for (let i = 0; i < exp.consecutive.length; i++) {
      const subExp = exp.consecutive[i]
      let matched = match(text.substring(pointer), subExp, enrich)
      if (matched === null || (pointer > 0 && matched.start !== 0)) {
        if (isOptional(subExp)) continue
        else if (matches.length) {
          return matchAtPos(text, exp, (matches.at(-1) as Match).end, enrich)
        } else {
          return null
        }
      } else {
        if (pointer === 0 && firstMatchWithoutOptional && firstMatchWithoutOptional.start < matched.start) {
          matched = firstMatchWithoutOptional
          i = exp.consecutive.indexOf(firstSubExpNonOptional as MatchingExpression)
        }
        matches.push(matched)
        if (pointer === 0) pointer = matched.end
        else pointer += matched.match.length
      }
    }
    return createMatchData(
      matches.reduce((acc, item) => acc + item.match, ''),
      matches[0].start,
      enrich && (() => matches.map(match => match.data).flat())
    )
  } else if ('repeat' in exp) {
    let pointer = 0
    const matches: Match[] = []
    let matched: Match | null
    do {
      matched = match(text.substring(pointer), exp.repeat, enrich)
      if (matched && (pointer === 0 || matched.start === 0)) {
        matches.push(matched)
        if (pointer === 0) pointer = matched.end
        else pointer += matched.match.length
      } else break
    } while (matched)
    if (!matches.length) return null
    return createMatchData(
      matches.reduce((acc, item) => acc + item.match, ''),
      matches[0].start,
      enrich && (() => matches.map(match => match.data).flat())
    )
  }
  return null
}

// either
// - teenNumberWords
// - multipleOfTenWords
// - multipleOfTenWords?-singleDigitNumberWords
const oneToNinetyNine: MatchingExpressionOneOf = {
  oneOf: [
    ...noNull(teenNumberWords),
    ...noNull(multipleOfTenWords),
    {
      consecutive: [{
        consecutive: [{
          oneOf: noNull(multipleOfTenWords),
          match: ['earliest', 'longest'],
        }, {
          oneOf: separator,
          match: 'earliest'
        }],
        optional: true
      }, {
        oneOf: noNull(singleDigitNumberWords),
        match: 'earliest'
      }]
    }
  ],
  match: ['earliest', 'longest'],
}
// either
// - oneToNinetyNine?-hundredWord-oneToNinetyNine?
const hundredToNinetyNineHundredNinetyNine: MatchingExpressionConsecutive = {
  consecutive: [{
    consecutive: [oneToNinetyNine, {
      oneOf: separator,
      match: 'earliest'
    }],
    optional: true
  }, {
    oneOf: noNull(hundredWord)
  }, {
    consecutive: [{
      oneOf: separator,
      match: 'earliest'
    }, {
      consecutive: ['and', {
        oneOf: separator,
        match: 'earliest'
      }],
      optional: true
    }, oneToNinetyNine],
    optional: true
  }],
}
const oneToNinetyNineHundredNinetyNine: MatchingExpressionOneOf = {
  oneOf: [
    oneToNinetyNine,
    hundredToNinetyNineHundredNinetyNine
  ],
  match: ['earliest', 'longest'],
}
const powerOfThousandMatchings: MatchingExpressionConsecutive = {
  consecutive: [{
    consecutive: [oneToNinetyNineHundredNinetyNine, {
      oneOf: separator,
      match: 'earliest'
    }],
    optional: true
  }, {
    repeat: {
      consecutive: [{
        oneOf: noNull(powerOfThousandWords),
        match: ['earliest', 'longest']
      }, {
        consecutive: [{
          oneOf: separator,
          match: 'earliest'
        }, {
          consecutive: ['and', {
            oneOf: separator,
            match: 'earliest'
          }],
          optional: true
        }, oneToNinetyNineHundredNinetyNine],
        optional: true
      }, {
        oneOf: separator,
        match: 'earliest',
        optional: true
      }]
    }
  }],
}

const numberWords: MatchingExpressionConsecutive = {
  consecutive: [{
    consecutive: [{
      oneOf: ['negative', 'positive'],
    }, ' '],
    optional: true,
  }, {
    oneOf: [
      ...noNull(zeroWord),
      oneToNinetyNineHundredNinetyNine,
      powerOfThousandMatchings,
    ],
    match: ['earliest', 'longest'],
  }, {
    consecutive: [' point', {
      repeat: {
        consecutive: [' ', {
          oneOf: noNull(singleDigitNumberWords),
          match: 'earliest'
        }],
      },
    }],
    optional: true,
  }]
}

/*const wordExamples = [
  'five',
  'fourteen',
  'twenty-three',
  'one hundred five',
  'one hundred and twenty-five',
  'two thousand and twenty',
  'one million two hundred thirty-four',
  'one million two hundred thirty-four thousand five hundred sixty-seven',
  'two thousand two million', // eh
  'twenty one hundred',

  'one point five',
  'zero point zero zero seven',
  'one third',
  'forty two divided by five hundred and six',
  'a dozen',
]*/

export function findNumberWord(text: string) {
  const matched = match(text, numberWords, enrichNumberWords) as (Omit<Match, 'data'> & { data: number }) | null
  if (matched) matched.data = findNumeric(matched)
  return matched
}

export function findNumeric(match: Match) {
  const dataArray = Array.isArray(match.data) ? match.data : [match.data]
  const point = dataArray.indexOf('.')
  const preFractionDigitData = point === -1 ? dataArray : dataArray.slice(0, point)
  const postFractionDigitData = point === -1 ? [] : dataArray.slice(point)
  let fraction = Decimal(postFractionDigitData.filter(item => typeof item === 'number').join('') || 0)
  fraction = fraction.div(Decimal.pow(10, fraction.e + 1))
  let data = preFractionDigitData.filter(item => typeof item === 'number')
  const isNegative = dataArray.find(item => typeof item === 'string' && !!item) === '-'
  let buffer = []
  for (let i = 0; i < data.length; i++) {
    if (
      data[i] !== 0 && data[i] % 10 === 0 && data[i] / 10 <= 9 &&
      data[i + 1] <= 9
    ) {
      buffer.push(data[i] + data[i + 1])
      i++
    } else {
      buffer.push(data[i])
    }
  }
  data = buffer
  buffer = []
  for (let x = 2; ; x++) {
    for (let i = 0; i < data.length; i++) {
      if (
        data[i] < (10 ** x) &&
        Math.log10(data[i + 1]) === x
      ) {
        buffer.push(data[i] * data[i + 1])
        if (data[i + 2] < (10 ** x)) {
          buffer[buffer.length - 1] += data[i + 2]
          i++
        }
        i++
      } else {
        buffer.push(data[i])
      }
    }
    data = buffer
    buffer = []
    if (data.length === 1) break
  }
  let number = Decimal(data[0])
  if (fraction) number = number.add(fraction)
  if (isNegative) number = number.mul(-1)
  return number.toNumber()
}
