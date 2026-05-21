import { API } from './api'

export interface RagChunk {
  text: string
  score: number
  source: string
}

export interface Metrics {
  latency_ms:           number
  ttft_ms:              number
  input_tokens:         number
  output_tokens:        number
  tokens_per_sec:       number
  cost_per_request_usd: number
  cost_per_month_usd:   number
  retrieved_chunks?:    number
}

export type ApproachEvent =
  | { type: 'rag_retrieved'; chunks: RagChunk[] }
  | { type: 'token';         text: string }
  | { type: 'done';          metrics?: Metrics; skipped?: boolean }
  | { type: 'error';         message: string }

export async function runApproach(
  approachId: string,
  query: string,
  signal: AbortSignal,
  onEvent: (e: ApproachEvent) => void,
): Promise<void> {
  let resp: Response
  try {
    resp = await fetch(`${API}/run/${approachId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    onEvent({ type: 'error', message: `Network: ${(err as Error).message}` })
    return
  }

  if (!resp.ok || !resp.body) {
    onEvent({ type: 'error', message: `HTTP ${resp.status}` })
    return
  }

  const reader  = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let idx: number
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx)
        buffer      = buffer.slice(idx + 2)
        if (!frame.startsWith('data: ')) continue
        const payload = frame.slice(6).trim()
        if (!payload) continue
        try {
          onEvent(JSON.parse(payload) as ApproachEvent)
        } catch {
          //skip malformed frames
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      onEvent({ type: 'error', message: (err as Error).message })
    }
  }
}
