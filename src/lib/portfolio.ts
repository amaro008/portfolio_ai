import { supabaseAdmin } from './supabase'

const DATABURSATIL_TOKEN = process.env.DATABURSATIL_TOKEN!

const DATABURSATIL_TICKERS = [
  'VOO', 'XLV', 'VWO', 'VXUS', 'IYW',
  'FMTY14', 'DANHOS13',
]

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
}

const MANUAL_TICKERS = ['USD-MXN', 'SMARTCASH', 'NOVA']

// ── DataBursatil ─────────────────────────────────────────────
export async function fetchDataBursatilPrices(): Promise<Record<string, number>> {
  const tickers = DATABURSATIL_TICKERS.join(',')
  const url = `https://api.databursatil.com/v2/intradia?token=${DATABURSATIL_TOKEN}&emisora_serie=${tickers}&bolsa=BMV`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`DataBursatil error: ${res.status}`)

  const data = await res.json()
  const prices: Record<string, number> = {}

  for (const ticker of DATABURSATIL_TICKERS) {
    const price = data[ticker]?.BMV?.ultimo ?? data[ticker]?.BIVA?.ultimo
    if (price) prices[ticker] = Number(price)
    else console.warn(`⚠️ Sin precio para ${ticker}`)
  }
  return prices
}

// ── CoinGecko ────────────────────────────────────────────────
export async function fetchCoinGeckoPrices(): Promise<Record<string, number>> {
  const ids = Object.values(COINGECKO_IDS).join(',')
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=mxn`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)

  const data = await res.json()
  const prices: Record<string, number> = {}

  for (const [ticker, coinId] of Object.entries(COINGECKO_IDS)) {
    const price = data[coinId]?.mxn
    if (price) prices[ticker] = Number(price)
  }
  return prices
}

// ── Precios manuales desde portfolioai_positions ─────────────
export async function fetchManualPrices(): Promise<Record<string, number>> {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('portfolioai_positions')
    .select('ticker, buy_price_mxn')
    .in('ticker', MANUAL_TICKERS)

  if (error) throw error

  const prices: Record<string, number> = {}
  for (const row of data ?? []) {
    prices[row.ticker] = Number(row.buy_price_mxn)
  }
  return prices
}

// ── Guardar snapshot ─────────────────────────────────────────
export async function saveSnapshot(
  allPrices: Record<string, number>,
  sources: Record<string, string>
) {
  const db = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const rows = Object.entries(allPrices).map(([ticker, price_mxn]) => ({
    date: today,
    ticker,
    price_mxn,
    source: sources[ticker] ?? 'unknown',
  }))

  const { error } = await db
    .from('portfolioai_snapshots')
    .upsert(rows, { onConflict: 'date,ticker' })

  if (error) throw error
  return rows
}
