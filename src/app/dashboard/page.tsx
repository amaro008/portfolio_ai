'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Position, Snapshot, AssetPerformance, DailyTotal, PortfolioTotals } from '@/types'

type Range = '1m' | '3m' | '6m' | '1a' | 'todo'

const CATEGORY_COLORS: Record<string, string> = {
  etf:    '#378ADD',
  fibra:  '#1D9E75',
  cripto: '#EF9F27',
  bono:   '#7F77DD',
  fx:     '#E24B4A',
}

const CATEGORY_LABELS: Record<string, string> = {
  etf: 'ETF', fibra: 'Fibra', cripto: 'Cripto', bono: 'Bono', fx: 'FX',
}

function buildContext(performance: AssetPerformance[], totals: PortfolioTotals) {
  const lines = performance.map(a =>
    `${a.ticker} (${a.name}): compra $${a.buy_price_mxn} → actual $${a.current_price_mxn} MXN, retorno ${a.return_pct}%, valor $${a.value_mxn.toLocaleString()} MXN`
  )
  return `Portafolio total: $${totals.value.toLocaleString()} MXN | Costo: $${totals.cost.toLocaleString()} | Ganancia: $${totals.return_mxn.toLocaleString()} (${totals.return_pct}%)
Activos:\n${lines.join('\n')}`
}

function computePerformance(positions: Position[], snapshots: Snapshot[]): AssetPerformance[] {
  const latestPrices: Record<string, number> = {}
  for (const s of snapshots) latestPrices[s.ticker] = s.price_mxn

  return positions.map(pos => {
    const current   = latestPrices[pos.ticker] ?? pos.buy_price_mxn
    const value_mxn = pos.quantity * current
    const cost_mxn  = pos.quantity * pos.buy_price_mxn
    return {
      ticker:            pos.ticker,
      name:              pos.name,
      category:          pos.category,
      buy_price_mxn:     pos.buy_price_mxn,
      current_price_mxn: current,
      quantity:          pos.quantity,
      value_mxn:         Math.round(value_mxn),
      cost_mxn:          Math.round(cost_mxn),
      return_pct:        parseFloat((((current - pos.buy_price_mxn) / pos.buy_price_mxn) * 100).toFixed(2)),
      return_mxn:        Math.round(value_mxn - cost_mxn),
    }
  }).sort((a, b) => b.return_pct - a.return_pct)
}

function computeDailyTotals(positions: Position[], snapshots: Snapshot[]): DailyTotal[] {
  const byDate: Record<string, Record<string, number>> = {}
  for (const s of snapshots) {
    if (!byDate[s.date]) byDate[s.date] = {}
    byDate[s.date][s.ticker] = s.price_mxn
  }
  return Object.entries(byDate).map(([date, prices]) => ({
    date,
    total_mxn: Math.round(positions.reduce((sum, p) => sum + p.quantity * (prices[p.ticker] ?? p.buy_price_mxn), 0)),
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export default function Dashboard() {
  const [range, setRange]             = useState<Range>('3m')
  const [positions, setPositions]     = useState<Position[]>([])
  const [snapshots, setSnapshots]     = useState<Snapshot[]>([])
  const [loading, setLoading]         = useState(true)
  const [aiText, setAiText]           = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [question, setQuestion]       = useState('')

  // Load data
  useEffect(() => {
    setLoading(true)
    fetch(`/api/game?range=${range}`)
      .then(r => r.json())
      .then(d => { setPositions(d.positions ?? []); setSnapshots(d.snapshots ?? []) })
      .finally(() => setLoading(false))
  }, [range])

  const performance  = computePerformance(positions, snapshots)
  const dailyTotals  = computeDailyTotals(positions, snapshots)

  const totalValue     = performance.reduce((s, a) => s + a.value_mxn, 0)
  const totalCost      = performance.reduce((s, a) => s + a.cost_mxn, 0)
  const totalReturn    = totalValue - totalCost
  const totalReturnPct = totalCost > 0 ? ((totalReturn / totalCost) * 100).toFixed(1) : '0'

  const totals: PortfolioTotals = {
    value: totalValue, cost: totalCost,
    return_mxn: totalReturn, return_pct: parseFloat(totalReturnPct),
  }

  // Distribution by category
  const byCat: Record<string, number> = {}
  for (const a of performance) {
    byCat[a.category] = (byCat[a.category] ?? 0) + a.value_mxn
  }

  const askAI = useCallback(async (q: string) => {
    if (!q.trim() || performance.length === 0) return
    setAiLoading(true)
    setAiText('')
    const context = buildContext(performance, totals)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, context }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value)
      setAiText(text)
    }
    setAiLoading(false)
  }, [performance, totals])

  const formatMXN = (n: number) =>
    '$' + Math.round(n).toLocaleString('es-MX')

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white p-4 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-xl font-medium">Portfolio.AI</h1>
          <p className="text-sm text-white/40 mt-0.5">Actualizado diariamente · MXN</p>
        </div>
        <div className="flex gap-1">
          {(['1m','3m','6m','1a','todo'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${
                range === r
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'border-white/10 text-white/40 hover:border-white/20'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-white/30 text-sm">
          Cargando portafolio...
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Valor actual',    value: formatMXN(totalValue),   sub: 'MXN' },
              { label: 'Costo total',     value: formatMXN(totalCost),    sub: 'MXN' },
              { label: 'Ganancia',        value: formatMXN(totalReturn),  sub: `${totalReturnPct}%`, up: totalReturn >= 0 },
              { label: 'Activos',         value: String(positions.length), sub: `${Object.keys(byCat).length} categorías` },
            ].map(m => (
              <div key={m.label} className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">{m.label}</p>
                <p className={`text-lg font-medium ${m.up === true ? 'text-[#1D9E75]' : m.up === false ? 'text-[#E24B4A]' : ''}`}>
                  {m.value}
                </p>
                <p className={`text-xs mt-0.5 ${m.up === true ? 'text-[#1D9E75]' : 'text-white/30'}`}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Distribution bar */}
          <div className="mb-6">
            <p className="text-xs text-white/40 mb-2">Distribución por categoría</p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {Object.entries(byCat).map(([cat, val]) => (
                <div key={cat} style={{ flex: val, background: CATEGORY_COLORS[cat] ?? '#888' }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {Object.entries(byCat).map(([cat, val]) => (
                <span key={cat} className="text-xs text-white/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: CATEGORY_COLORS[cat] }} />
                  {CATEGORY_LABELS[cat]} {totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : 0}%
                </span>
              ))}
            </div>
          </div>

          {/* Portfolio line — simple SVG sparkline */}
          {dailyTotals.length > 1 && (
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium mb-3">Valor del portafolio</p>
              <PortfolioLine data={dailyTotals} />
            </div>
          )}

          {/* Asset table */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 overflow-x-auto">
            <p className="text-sm font-medium mb-3">Posiciones</p>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-white/30 text-xs border-b border-white/10">
                  <th className="text-left pb-2 font-normal">Activo</th>
                  <th className="text-right pb-2 font-normal">Precio compra</th>
                  <th className="text-right pb-2 font-normal">Precio actual</th>
                  <th className="text-right pb-2 font-normal">Valor MXN</th>
                  <th className="text-right pb-2 font-normal">Retorno</th>
                </tr>
              </thead>
              <tbody>
                {performance.map(a => (
                  <tr key={a.ticker} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5">
                      <span className="font-medium">{a.ticker}</span>
                      <span className="text-white/30 ml-2 text-xs">{a.name}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: CATEGORY_COLORS[a.category] + '22', color: CATEGORY_COLORS[a.category] }}>
                        {CATEGORY_LABELS[a.category]}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-white/50 text-xs">${a.buy_price_mxn.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-xs">${a.current_price_mxn.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-xs">{formatMXN(a.value_mxn)}</td>
                    <td className={`py-2.5 text-right font-medium text-xs ${a.return_pct >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]'}`}>
                      {a.return_pct >= 0 ? '+' : ''}{a.return_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI panel */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium mb-3">Análisis con IA</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {[
                '¿Cuál es mi activo con mejor y peor rendimiento?',
                '¿Qué tan diversificado está mi portafolio?',
                '¿Debería rebalancear algo?',
                'Dame una proyección optimista y pesimista a 12 meses',
              ].map(q => (
                <button key={q} onClick={() => askAI(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:border-white/30 hover:text-white/80 transition-all">
                  {q.length > 40 ? q.slice(0, 40) + '…' : q}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { askAI(question); setQuestion('') } }}
                placeholder="Pregunta sobre tu portafolio..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30 placeholder:text-white/20"
              />
              <button onClick={() => { askAI(question); setQuestion('') }}
                className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/15 transition-all">
                →
              </button>
            </div>

            {(aiLoading || aiText) && (
              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {aiLoading && !aiText ? (
                  <span className="text-white/30 animate-pulse">Analizando...</span>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: aiText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}

// Simple SVG line chart
function PortfolioLine({ data }: { data: DailyTotal[] }) {
  const W = 800, H = 120, PAD = 8
  const values = data.map(d => d.total_mxn)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (d.total_mxn - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const linePath = 'M' + pts.join('L')
  const areaPath = linePath + `L${W - PAD},${H} L${PAD},${H} Z`
  const isUp = values[values.length - 1] >= values[0]
  const col  = isUp ? '#1D9E75' : '#E24B4A'

  const first = data[0]?.date.slice(0, 7)
  const last  = data[data.length - 1]?.date.slice(0, 7)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <path d={areaPath} fill={col} fillOpacity={0.08} stroke="none" />
        <path d={linePath} fill="none" stroke={col} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs text-white/20 mt-1">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  )
}
