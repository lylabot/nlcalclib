import {ExchangeRate} from './units/exchange-rate'

let _exchangeRate: ExchangeRate | undefined = undefined

export function setExchangeRate(exchangeRate: ExchangeRate) {
  _exchangeRate = exchangeRate
}

export function getExchangeRate() {
  return _exchangeRate
}
