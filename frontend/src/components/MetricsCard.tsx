import type { Metrics } from '../lib/streamApproach'
import { formatCost, formatLatency, formatMonthlyCost, formatTokensPerSec } from '../lib/format'

export default function MetricsCard({ metrics }: { metrics: Metrics }) {
  return (
    <div
      className="border-t px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"
      style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}
    >
      <Stat label="Latens"    value={formatLatency(metrics.latency_ms)} />
      <Stat label="Tok/sek"   value={formatTokensPerSec(metrics.tokens_per_sec)} />
      <Stat
        label="Per fråga"
        value={formatCost(metrics.cost_per_request_usd)}
        hint={metrics.cost_per_request_usd === 0 ? 'lokal hårdvara' : undefined}
      />
      <Stat
        label="$/månad"
        value={formatMonthlyCost(metrics.cost_per_month_usd)}
        hint={metrics.cost_per_month_usd === 0 ? 'oavsett volym' : '@ 1k req/dag'}
      />
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="font-mono font-medium" style={{ color: 'var(--ink)' }}>
        {value}
        {hint && <span className="text-[10px] ml-1" style={{ color: 'var(--muted)' }}>· {hint}</span>}
      </div>
    </div>
  )
}
