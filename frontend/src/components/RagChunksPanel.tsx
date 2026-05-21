import { useState } from 'react'
import type { RagChunk } from '../lib/streamApproach'

export default function RagChunksPanel({ chunks }: { chunks: RagChunk[] }) {
  const [open, setOpen] = useState(true)

  if (chunks.length === 0) {
    return (
      <div
        className="border-b px-4 py-2 text-xs italic"
        style={{ borderColor: 'var(--line)', color: 'var(--muted)', background: 'var(--bg2)' }}
      >
        Inga relevanta dokument hittades.
      </div>
    )
  }

  return (
    <div className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs hover:opacity-80"
        style={{ color: 'var(--ink2)' }}
      >
        <span>
          <span className="mr-1.5" style={{ color: 'var(--accent)' }}>◆</span>
          Hämtade {chunks.length} {chunks.length === 1 ? 'chunk' : 'chunks'}
        </span>
        <span style={{ color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-1.5 max-h-44 overflow-auto">
          {chunks.map((c, i) => (
            <div
              key={i}
              className="text-xs rounded p-2 leading-snug"
              style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line)' }}
            >
              <div className="flex justify-between mb-1 font-mono">
                <span style={{ color: 'var(--accent)' }}>{c.source}</span>
                <span style={{ color: 'var(--muted)' }}>score {c.score}</span>
              </div>
              <div className="font-mono text-[11px]">
                {c.text.length > 220 ? c.text.slice(0, 220) + '…' : c.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
