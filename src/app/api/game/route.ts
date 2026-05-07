import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '3m'

  const db = supabaseAdmin()

  const startDate = (() => {
    const d = new Date()
    if (range === '1m')  d.setMonth(d.getMonth() - 1)
    if (range === '3m')  d.setMonth(d.getMonth() - 3)
    if (range === '6m')  d.setMonth(d.getMonth() - 6)
    if (range === '1a')  d.setFullYear(d.getFullYear() - 1)
    if (range === 'todo') return '2000-01-01'
    return d.toISOString().split('T')[0]
  })()

  const [posRes, snapRes] = await Promise.all([
    db.from('portfolioai_positions').select('*').eq('is_active', true),
    db.from('portfolioai_snapshots')
      .select('date, ticker, price_mxn')
      .gte('date', startDate)
      .order('date', { ascending: true }),
  ])

  if (posRes.error)  return NextResponse.json({ error: posRes.error.message },  { status: 500 })
  if (snapRes.error) return NextResponse.json({ error: snapRes.error.message }, { status: 500 })

  return NextResponse.json({
    positions: posRes.data,
    snapshots: snapRes.data,
  })
}
