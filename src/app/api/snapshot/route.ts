import { NextResponse } from 'next/server'
import {
  fetchDataBursatilPrices,
  fetchCoinGeckoPrices,
  fetchManualPrices,
  saveSnapshot,
} from '@/lib/portfolio'

// Vercel Cron llama este endpoint — protegido con CRON_SECRET
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [dbResult, cgResult, manualResult] = await Promise.allSettled([
      fetchDataBursatilPrices(),
      fetchCoinGeckoPrices(),
      fetchManualPrices(),
    ])

    const allPrices: Record<string, number> = {}
    const sources:   Record<string, string>  = {}
    const errors:    string[] = []

    if (dbResult.status === 'fulfilled') {
      for (const [t, p] of Object.entries(dbResult.value)) {
        allPrices[t] = p; sources[t] = 'databursatil'
      }
    } else errors.push(`DataBursatil: ${dbResult.reason}`)

    if (cgResult.status === 'fulfilled') {
      for (const [t, p] of Object.entries(cgResult.value)) {
        allPrices[t] = p; sources[t] = 'coingecko'
      }
    } else errors.push(`CoinGecko: ${cgResult.reason}`)

    if (manualResult.status === 'fulfilled') {
      for (const [t, p] of Object.entries(manualResult.value)) {
        allPrices[t] = p; sources[t] = 'manual'
      }
    } else errors.push(`Manual: ${manualResult.reason}`)

    if (Object.keys(allPrices).length === 0) {
      return NextResponse.json({ ok: false, errors }, { status: 500 })
    }

    const saved = await saveSnapshot(allPrices, sources)

    return NextResponse.json({
      ok: true,
      count: saved.length,
      date: new Date().toISOString().split('T')[0],
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
