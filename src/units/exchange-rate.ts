import Decimal from 'decimal.js'
import {ISO4217Currency} from './definitions/currency'

export abstract class ExchangeRate {
  abstract currentRate(from: ISO4217Currency, to: ISO4217Currency): Decimal | null

  abstract historicRate(currency: ISO4217Currency, from: number, to: number): Decimal | null
}

export class FreeExchangerateAPI extends ExchangeRate {
  cache: Record<string, number>

  constructor() {
    super()
    this.cache = {}
    this.refreshRate()
  }

  refreshRate() {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        this.cache = data.rates
        setTimeout(() => this.refreshRate(), (data.time_next_update_unix - Date.now()) + 1000)
      })
      .catch(error => console.log(error))
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
