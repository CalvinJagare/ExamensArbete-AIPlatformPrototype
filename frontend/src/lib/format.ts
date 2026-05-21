export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function formatTokensPerSec(tps: number): string {
  if (tps <= 0) return '—'
  return `${tps.toFixed(0)} t/s`
}

export function formatCost(usd: number): string {
  if (usd === 0) return 'gratis'
  if (usd < 0.000005) return '<$0.00001'
  if (usd < 0.01) return `$${usd.toFixed(5)}`
  return `$${usd.toFixed(4)}`
}

export function formatMonthlyCost(usd: number): string {
  if (usd === 0) return 'gratis'
  if (usd < 1)   return `$${usd.toFixed(2)}`
  if (usd < 100) return `$${usd.toFixed(1)}`
  return `$${usd.toFixed(0)}`
}
