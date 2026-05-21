import type { Prompt } from '../pages/DemoPage'

interface Props {
  prompts:  Prompt[]
  query:    string
  setQuery: (s: string) => void
  onRun:    (s: string) => void
  busy:     boolean
}

export default function PromptBar({ prompts, query, setQuery, onRun, busy }: Props) {
  return (
    <div
      className="px-6 py-4 border-b flex flex-col gap-3"
      style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}
    >
      {prompts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: 'var(--muted)' }}>
            Förslag
          </span>
          {prompts.map(p => (
            <button
              key={p.id}
              onClick={() => { setQuery(p.query); onRun(p.query) }}
              className="px-3 py-1.5 text-xs rounded-md transition-colors hover:opacity-90"
              style={{
                background: 'var(--panel)',
                color:      'var(--ink2)',
                border:     '1px solid var(--line2)',
              }}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); onRun(query) }}
      >
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Eller skriv en egen fråga…"
          className="flex-1 px-3 py-2 text-sm rounded-md"
          style={{
            background: 'var(--panel)',
            color:      'var(--ink)',
            border:     '1px solid var(--line2)',
          }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          {busy ? 'Kör om →' : 'Kör alla →'}
        </button>
      </form>
    </div>
  )
}
