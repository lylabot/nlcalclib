# nlCalcLib

`nlCalcLib` is a library for evaluating natural-language expressions. It solves calculation expressions entirely using
rule-based logic.

It supports:

- a wide range of expressions
- number words
- units and complex unit combinations
- currency with customizable exchange rates
- date and time calculations with timezone support

See the [comprehensive list of expressions](#examples)

## Install

With npm:

```shell
npm i lylabot/nlcalclib
```

## Usage

### `evaluate()`

`evaluate(expression: string, format: boolean = true, exchangeRate?: ExchangeRate): string | NumberToken | DateTimeToken | null`

For more on exchange rates see [Exchange Rates](#exchange-rates)

#### Parameters

| Parameter                                  | Description                                                                                                                                                                                                                                                                       |
|--------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **expression** `string`                    | The natural-language expression to evaluate.                                                                                                                                                                                                                                      |
| **format** (optional) `boolean`            | Whether or not to format the result. If this is true, `evaluate` returns a `string` with the formatted number, otherwise a `NumberToken`, or a `DateTimeToken` to be formatted in a custom way (e.g. for custom date-time formats, different unit formatting) Defaults to `true`. |
| **exchangeRate** (optional) `ExchangeRate` | A child instance of the included `ExchangeRate` class. Must be provided for support for currency conversions.                                                                                                                                                                     |

#### Returns

- When _format_ is `true`: `string` The result of the evaluation, or `"Error"` if the evaluation failed.
- When _format_ is `false`: `NumberToken | DateTimeToken` An object containing data about result of the evaluation, or
  `null` if the
  evaluation failed.

`NumberToken` has the following properties:

| Property                              | Description                                                                                      |
|---------------------------------------|--------------------------------------------------------------------------------------------------|
| **type** `"number"`                   | Indicating the type of the token. Always `"number"`                                              |
| **value** `Decimal`                   | [decimal.js](https://mikemcl.github.io/decimal.js/) instance containing the value of the number. |
| **unit** (optional) `Unit`            | A string, array, or object representing the unit of the number.                                  |
| **isPercentage** (optional) `boolean` | Whether or not this number is a percentage.                                                      |

`Unit` can be either a `string`, `string[]`, or an object `{ num: string | string[], den: string | string[] }` where
`num` are all numerator unit-parts and `den` are all denominator unit-parts. You can use the [
`normalizeUnit()`](#normalizeunit) utility
function to turn any of those into a standardized object `{ num: string[], den: string[] }`.

`DateTimeToken` has the following properties:

| Property                        | Description                                                                                            |
|---------------------------------|--------------------------------------------------------------------------------------------------------|
| **type** `"datetime"`           | Indicating the type of the token. Always `"datetime"`                                                  |
| **utcValue** `NumberToken`      | The UTC milliseconds since the unix epoch.                                                             |
| **offset** `Decimal`            | The timezone offset from UTC for this time in minutes.                                                 |
| **hasYear** `boolean`           | Whether the year is relevant in this token. For expressions that dont specify a year, this is `false`. |
| **timeAccuracy** `TimeAccuracy` | How much exactly time should be formatted.                                                             |

`TimeAccuracy` is an enum with these values:

- NoTime = 0, for date-only tokens
- Hour = 1
- Minute = 2
- Second = 3
- Millisecond = 4

### Exchange Rates

Due to the non-static nature of currency conversion, current exchange rate values have to be supplied in the
implementation. There is the `ExchangeRate` abstract class that can be implemented and passed to `evaluate()` to do
that. For your convenience, there is already an implementation provided that pulls data from the
open https://exchangerate-api.com.

Otherwise, extend `ExchangeRate` and implement those two methods (although `.historicRate()` is not used yet and
reserved for future use):

`currentRate(from: ISO4217Currency, to: ISO4217Currency): Decimal | null`

Should give the current conversion rate from one currency to another. The return value is multiplied with the value of
the original (`from`) currency to calculate the converted (`to`) currency. `from` and `to` are given as three-letter
codes according to the ISO 4217 standard.

`historicRate(currency: ISO4217Currency, from: number, to: number): Decimal | null`

_Currently unused_  
Should give the conversion rate from one year to another within the same currency. The return value is multiplied with
the value of the original (`from`) year to calculate the converted (`to`) year.

### `tokenize()`

`tokenize(expression: string): [Token | null, FormattingToken | null]`

Calculates a tuple containing an AST and a formatting token from a given expression. Returns a tuple containing `null`
and `null` if tokenizing fails, and tuple containing an AST and `null` formatting when there was no formatting
instructions in the expression (like "...to decimal" or "...in meters"). See [[./src/tokenize/types.ts]] for all token
types and formatting data types.

### `resolve()`

`resolve(token: Token): NumberToken | NormalizedToken | DateTimeToken | null`

Resolves (calculates) a tokenized expression (supports `NumberToken`, `DateTimeToken`, `OperatorToken`, and
`EquationToken` as the root node). Pass the AST returned from `tokenize()`, except `ListToken`. For `ListToken`, pass
child tokens individually. Returns `null` if the expression cannot be resolved. This function may throw an error.

### `formatNumber()`

`formatNumber(number: NumericToken | DateTimeToken, formatting?: FormattingToken): string`

Formats a `NumericToken` or `DateTimeToken` to a string, with an optional `FormattingToken` including its unit if
applicable.

### Utility

There are some exposed utility functions:

#### `normalizeUnit()`

`normalizeUnit(unit: Unit): NormalizedCompositeUnit`

Where `NormalizedCompositeUnit` is `{ num: string[], den: string[] }`. Turns all the various forms `Unit` comes in into
a standard object. Here, `num` are all numerator unit-parts and `den` are all denominator unit-parts. E.g. "km/h" would
be represented as `{num: ['kilometer'], den: ['hour']}`.

#### `findNumberWord()`

`findNumberWord(text: string): Match`

Finds the first number word of a string and returns match data object with these properties:

| Property        | Description                                    |
|-----------------|------------------------------------------------|
| match: `string` | The matched number word.                       |
| start: `number` | Start index of the match.                      |
| end: `number`   | End  index of the match.                       |
| data: `number`  | The numeric value the matched words represent. |

To get all number words in a string, call this function again and pass a substring that starts from the `end` index, or
replace the matched number words with digits or a placeholder.

#### `replaceNumberWords()`

`replaceNumberWords(text: string): string`

Replaces all number words of a string with their corresponding digits.

## Examples

### Number Words

- `one hundred and twenty-three` → `123`
- `two point seven three` → `2.73`
- `negative three hundred` → `-300`
- `a million` → `1,000,000`

### Operations

- `30 plus 20` → `50`
- `4 -2` → `2`
- `3 − 42` → `-39`
- `3,000 minus 12` → `2,988`
- `3 multiplied by 4` → `12`
- `3 times 4` → `12`
- `1,000 divided by 200` → `5`

<br>

- `3 to the power of 2` → `9`
- `remainder of 21 divided by 5` → `1`
- `21 mod 5` → `1`
- `7 fact` → `5,040`
- `absolute of -4` → `4`
- `square root of 81` → `9`
- `cube root of 27` → `3`
- `root 5 of 100` → `2.511886432`
- `log 20 base 4` → `2.160964047`

<br>

- `total of 3, 4, 7 and 9` → `23`
- `average of 36, 42, 19 and 81` → `44.5`
- `count of 1, 2, 3, 4, 5` → `5`
- `median of 10, 20 and 30` → `20`
- `median of 10, 20, 30, 40` → `25`

<br>

- `larger of 100 and 200` → `200`
- `greater of 100 and 200` → `200`
- `smaller of 5 and 10` → `5`
- `lesser of 5 and 10` → `5`
- `half of 175` → `87.5`
- `midpoint between 150 and 300` → `225`
- `midpoint between 300 and 150` → `225`

<br>

- `random number between 1 and 10` → a number between 1 and 10
- `random number between 0 and 1` → a number between 1 and 10

<br>

- `gcd of 20 and 30` → `10`
- `lcm of 5 and 8` → `40`
- `10 permutation 3` → `720`
- `25 combination 3` → `2,300`
- `3 permutations of 10` → `720`
- `3 combinations of 25` → `2,300`
- `clamp 26 between 5 and 25` → `25`
- `clamp 4 from 5 to 25` → `5`

### Rounding

- `1/3 to 2 dp` → `0.33`
- `π to 5 digits` → `3.14159`
- `5.5 rounded` → `6`
- `5.3 rounded up` → `6`
- `37 to nearest 10` → `40`
- `$490 rounded to nearest hundred` → `500 US$`
- `2,100 to nearest thousand` → `2,000`
- `21 rounded up to nearest 5` → `25`
- `17 rounded down to nearest 3` → `15`

### Percentages

- `10% of 200` → `20`
- `200 + 10%` → `220`
- `10% on 200` → `220`
- `200 - 10%` → `180`
- `10% off 200` → `180`
- `20/200 as %` → `10%`
- `2/5 as percent` → `40%`
- `10% + 20%` → `30%`
- `30% + 0.4` → `70%`
- `50% * 30` → `15`
- `50% as fraction` → `1/2`
- `20/5 as multiplier` → `4x`
- `50 as x of 5` → `10x`
- `2 as multiplier of 1` → `2x`
- `2 as multiplier on 1` → `1x`

### Equations / Questions

- `6 is to what as 8 is to 80` → `60`
- `5 km is to 500m as 5 cm is to what` → `0.005 m`
- `30 minutes is to 3 hours as what is to 60 seconds` → `10s`
- `81 is 9 to what power` → `2`
- `9 equals what to the power of 2` → `3`
- `20 is 10% of what` → `200`
- `180 is 10% off what` → `200`
- `220 is 10% on what` → `200`
- `180 is what % off 200` → `10%`
- `180 is what % on 150` → `20%`
- `20 is what % of 200` → `10%`

### Units and Conversions

- `3.6km/h in m/s` → `1 m/s`
- `2N / 4 kg` → `0.5 m/s²`
- `0.5 m/s * 4kg/s` → `2 N`
- `1/50ms in Hz` → `20 Hz`
- `60bpm as Hz` → `1 Hz`
- `10c to f` → `50 °F`
- `14f to c` → `-10 °C`
- `6894.757293168 Pa in psi` → `1 psi`
- `4.184 Ws in cal` → `1 cal`
- `10 GB + 500 MB in GB` → `10.5 GB`
- `1 hour 15 minutes + 45 minutes` → `2h`

### Currency

- `1 usd in eur` → `€0.89`
- `1 cad in $` → `0.70 US$`

### Dates and Timezones

- `10 June + 3 weeks` → `1 July`
- `01.05.2005 + 3 years 2 months 3 weeks` → `22 July 2008`
- `3 weeks after March 14, 2019` → `4 April 2019`
- `28 days before March 12` → `12 February`
- `2 months 3 days after June 5` → `8 August`
- `yesterday + 1 week` → `30 October`
- `now - 1 month` → `25 September`
- `today at 2 - 30 minutes` → `24 October at 01:30`
- `January 10 - February 5` → `3w 5d`
- `days since July 15` → `101d`
- `days between 3 March and 17 May` → `75d`
- `week of year` → `43`
- `week number on march 12, 2021` → `10`
- `days in Q3` → `92d`
- `days in February 2020` → `29d`
- `6pm Sydney in Chicago` → `25 October at 02 GMT-5`
- `time in Tokyo when it is 9am in London` → `25 October at 18 GMT+9`
- `time in Paris` → `25 October at 13:16 GMT+1`
- `time in Thailand` → `25 October at 19:16 GMT+7`
- `time difference between Seattle and Moscow` → `10h`
- `April 1, 2019 3:30pm as iso` → `2019-04-01T15:30:00.000Z`
- `2019-04-01T15:30:00 to date` → `1 April 2019 at 15:30:00`
- `1733823083000 to date` → `10 December 2024 at 09:31:23.000`
- `current timestamp` → `1792930565.675`
