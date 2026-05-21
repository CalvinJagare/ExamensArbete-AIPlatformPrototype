import { useEffect, useRef, useState } from 'react'
import { runApproach, type Metrics, type RagChunk } from '../lib/streamApproach'
import type { Approach } from '../pages/DemoPage'
import MetricsCard from './MetricsCard'
import RagChunksPanel from './RagChunksPanel'
import TrainingStatsPanel from './TrainingStatsPanel'

interface Props {
  approach: Approach
  query:    string
}

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export default function ApproachPanel({ approach, query }: Props) {
  const [status,  setStatus]  = useState<Status>('idle')
  const [text,    setText]    = useState('')
  const [chunks,  setChunks]  = useState<RagChunk[] | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error,   setError]   = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!query) return

    //per-effect abort controller
    const ctl = new AbortController()

    setStatus('loading')
    setText('')
    setChunks(null)
    setMetrics(null)
    setError('')

    runApproach(approach.id, query, ctl.signal, ev => {
      if (ev.type === 'rag_retrieved') {
        setChunks(ev.chunks)
      } else if (ev.type === 'token') {
        setStatus('streaming')
        setText(prev => prev + ev.text)
      } else if (ev.type === 'done') {
        setStatus('done')
        if (ev.metrics) setMetrics(ev.metrics)
      } else if (ev.type === 'error') {
        setStatus('error')
        setError(ev.message)
      }
    })

    return () => ctl.abort()
  }, [approach.id, query])

  //autoscroll on new tokens
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/*header*/}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--accent)' }}>
            {approach.label}
          </div>
          <div className="text-[10px] font-mono truncate" style={{ color: 'var(--muted)' }}>
            {approach.model}
          </div>
        </div>
        <div className="text-xs mt-1 leading-snug" style={{ color: 'var(--muted)' }}>
          {approach.description}
        </div>
      </div>

      {chunks            && <RagChunksPanel    chunks={chunks} />}
      {approach.training && <TrainingStatsPanel stats={approach.training} />}

      {/*streaming output*/}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: 'var(--ink)' }}
      >
        {status === 'idle' && (
          <div className="text-xs italic" style={{ color: 'var(--muted)' }}>
            Välj en fråga ovan eller skriv din egen.
          </div>
        )}
        {status === 'loading' && <LoadingDots />}
        {(status === 'streaming' || status === 'done') && text}
        {status === 'done' && !text && chunks?.length === 0 && (
          <div className="text-xs italic" style={{ color: 'var(--muted)' }}>
            Modellen kördes inte — inget i korpusen att svara från.
          </div>
        )}
        {status === 'error' && (
          <div
            className="text-xs px-2 py-1.5 rounded"
            style={{ background: 'rgba(237,115,115,0.1)', color: 'var(--red)' }}
          >
            ⚠ {error}
          </div>
        )}
      </div>

      {metrics && <MetricsCard metrics={metrics} />}
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5 items-center text-xs" style={{ color: 'var(--muted)' }}>
      <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0s'   }} />
      <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
      <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
    </div>
  )
}
