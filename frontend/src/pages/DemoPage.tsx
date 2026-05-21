import { useEffect, useState } from 'react'
import { API } from '../lib/api'
import ApproachPanel from '../components/ApproachPanel'
import PromptBar from '../components/PromptBar'
import DocumentsModal, { type CorpusFile } from '../components/DocumentsModal'

export interface TrainingStats {
  base_model:         string
  method:             string
  dataset_size:       number
  epochs:             number
  training_minutes:   number
  gpu:                string
  estimated_cost_usd: number
  note?:              string
}

export interface Approach {
  id:          string
  label:       string
  description: string
  model:       string
  pricing_per_million_tokens?: { input: number; output: number }
  training?:   TrainingStats
}

export interface Prompt {
  id:    string
  label: string
  query: string
  hint?: string
}

export default function DemoPage() {
  const [approaches, setApproaches] = useState<Approach[]>([])
  const [prompts,    setPrompts]    = useState<Prompt[]>([])
  const [query,      setQuery]      = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [runKey,     setRunKey]     = useState(0)
  const [loadError,  setLoadError]  = useState('')
  const [docsOpen,   setDocsOpen]   = useState(false)
  const [corpus,     setCorpus]     = useState<CorpusFile[]>([])

  useEffect(() => {
    fetch(`${API}/approaches`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: Approach[]) => setApproaches(Array.isArray(data) ? data : []))
      .catch(err => setLoadError(`Kunde inte hämta approaches: ${err}`))

    fetch(`${API}/prompts`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: Prompt[]) => setPrompts(Array.isArray(data) ? data : []))
      .catch(() => { /**/ })

    fetch(`${API}/corpus`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: { files: CorpusFile[] }) => setCorpus(data.files ?? []))
      .catch(() => { /**/ })
  }, [])

  function runAll(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    //remount panels on rerun
    setActiveQuery(trimmed)
    setRunKey(k => k + 1)
  }

  return (
    <div className="h-screen w-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/*header*/}
      <header
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--line)' }}
      >
        <div>
          <div className="text-base font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            <span style={{ color: 'var(--accent)' }}>AI</span>-jämförelse
            <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>· Demo</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            En jämförelse av externa API:er, RAG, finjustering och lokala modeller
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDocsOpen(true)}
            className="text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 hover:opacity-90"
            style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)' }}
            title="Hantera RAG-dokument"
          >
            <span style={{ color: 'var(--accent)' }}>◆</span>
            Dokument
            {corpus.length > 0 && (
              <span
                className="ml-1 px-1.5 rounded text-[10px] font-mono"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
              >
                {corpus.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <DocumentsModal
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        onChange={setCorpus}
      />

      <PromptBar
        prompts={prompts}
        query={query}
        setQuery={setQuery}
        onRun={runAll}
        busy={runKey > 0}
      />

      {/*panel grid*/}
      <main
        className="flex-1 grid gap-px overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${Math.max(approaches.length, 1)}, minmax(0, 1fr))`,
          background:          'var(--line)',
        }}
      >
        {loadError && (
          <div
            className="col-span-full flex items-center justify-center text-sm px-6 text-center"
            style={{ background: 'var(--bg)', color: 'var(--red)' }}
          >
            {loadError}
            <span className="ml-2" style={{ color: 'var(--muted)' }}>
              · Är backend igång på {API}?
            </span>
          </div>
        )}
        {!loadError && approaches.length === 0 && (
          <div
            className="col-span-full flex items-center justify-center text-sm"
            style={{ background: 'var(--bg)', color: 'var(--muted)' }}
          >
            Laddar approaches…
          </div>
        )}
        {!loadError && approaches.map(a => (
          <ApproachPanel
            key={a.id + ':' + runKey}
            approach={a}
            query={activeQuery}
          />
        ))}
      </main>
    </div>
  )
}
