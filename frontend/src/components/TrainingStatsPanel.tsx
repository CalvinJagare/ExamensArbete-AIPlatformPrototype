import { useState } from 'react'
import type { TrainingStats } from '../pages/DemoPage'

export default function TrainingStatsPanel({ stats }: { stats: TrainingStats }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs hover:opacity-80"
        style={{ color: 'var(--ink2)' }}
      >
        <span>
          <span className="mr-1.5" style={{ color: 'var(--warm)' }}>◆</span>
          Träningsstatistik
        </span>
        <span style={{ color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono">
          <Row label="Bas"     value={stats.base_model} />
          <Row label="Metod"   value={stats.method} />
          <Row label="Dataset" value={`${stats.dataset_size.toLocaleString('sv-SE')} ex.`} />
          <Row label="Epoker" value={String(stats.epochs)} />
          <Row label="Tid"     value={formatDuration(stats.training_minutes)} />
          <Row label="GPU"     value={stats.gpu} />
          <Row
            label="Kostnad"
            value={stats.estimated_cost_usd === 0 ? 'gratis (lokal)' : `$${stats.estimated_cost_usd.toFixed(2)}`}
          />
        </div>
      )}
    </div>
  )
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const hours = min / 60
  return Number.isInteger(hours) ? `${hours} tim` : `${hours.toFixed(1)} tim`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="mr-1" style={{ color: 'var(--muted)' }}>{label}:</span>
      <span style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
