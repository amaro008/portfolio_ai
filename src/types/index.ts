export type Category = 'etf' | 'fibra' | 'cripto' | 'bono' | 'fx'
export type Source   = 'databursatil' | 'coingecko' | 'manual'

export type Position = {
  ticker:        string
  name:          string
  category:      Category
  quantity:      number
  buy_price_mxn: number
  buy_date:      string
  source:        Source
  is_active:     boolean
  notes?:        string
}

export type Snapshot = {
  date:      string
  ticker:    string
  price_mxn: number
  source:    Source
}

export type DailyTotal = {
  date:      string
  total_mxn: number
}

export type AssetPerformance = {
  ticker:            string
  name:              string
  category:          Category
  buy_price_mxn:     number
  current_price_mxn: number
  quantity:          number
  value_mxn:         number
  cost_mxn:          number
  return_pct:        number
  return_mxn:        number
}

export type PortfolioTotals = {
  value:      number
  cost:       number
  return_mxn: number
  return_pct: number
}
