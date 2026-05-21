import { useEffect, useRef, useState } from 'react'
import { API } from '../lib/api'

export interface CorpusFile {
  filename:    string
  size_bytes:  number
  chunk_count: number
  error?:      string
}

interface CorpusResponse {
  files:        CorpusFile[]
  total_chunks: number
}

interface Props {
  open:    boolean
  onClose: () => void
  onChange: (files: CorpusFile[]) => void
}

const ACCEPT = '.md,.txt,.pdf'

export default function DocumentsModal({ open, onClose, onChange }: Props) {
  const [files,    setFiles]    = useState<CorpusFile[]>([])
  const [busy,     setBusy]     = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error,    setError]    = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  //refresh on open
  useEffect(() => {
    if (!open) return
    fetch(`${API}/corpus`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: CorpusResponse) => {
        setFiles(data.files)
        onChange(data.files)
      })
      .catch(err => setError(String(err)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  //esc closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function uploadFiles(list: FileList | File[]) {
    const arr = Array.from(list)
    if (arr.length === 0) return
    setBusy(true)
    setError('')
    let latest: CorpusResponse = { files, total_chunks: 0 }
    for (const f of arr) {
      const fd = new FormData()
      fd.append('file', f)
      try {
        const resp = await fetch(`${API}/corpus`, { method: 'POST', body: fd })
        if (!resp.ok) {
          const detail = await resp.json().catch(() => ({}))
          setError(`${f.name}: ${detail.detail || resp.status}`)
          continue
        }
        latest = await resp.json()
      } catch (err) {
        setError(`${f.name}: ${(err as Error).message}`)
      }
    }
    setFiles(latest.files)
    onChange(latest.files)
    setBusy(false)
  }

  async function deleteFile(name: string) {
    setBusy(true)
    setError('')
    try {
      const resp = await fetch(`${API}/corpus/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({}))
        setError(`${name}: ${detail.detail || resp.status}`)
      } else {
        const latest = await resp.json() as CorpusResponse
        setFiles(latest.files)
        onChange(latest.files)
      }
    } catch (err) {
      setError(`${name}: ${(err as Error).message}`)
    }
    setBusy(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg overflow-hidden flex flex-col"
        style={{ background: 'var(--panel)', border: '1px solid var(--line2)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Dokument för RAG
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Lägg till .md, .txt eller .pdf — indexet byggs om automatiskt.
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none w-8 h-8 rounded hover:opacity-80"
            style={{ color: 'var(--muted)' }}
            title="Stäng (Esc)"
          >×</button>
        </div>

        <div
          className={'mx-5 mt-4 mb-3 rounded-md border-2 border-dashed py-8 text-center cursor-pointer transition-colors'}
          style={{
            borderColor: dragOver ? 'var(--accent)' : 'var(--line2)',
            background:  dragOver ? 'var(--accent-bg)' : 'var(--bg2)',
            color:       'var(--ink2)',
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files)
          }}
        >
          <div className="text-2xl mb-1">⤓</div>
          <div className="text-sm">
            {busy ? 'Laddar upp…' : 'Släpp filer här eller klicka för att välja'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            .md · .txt · .pdf
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) uploadFiles(e.target.files)
              if (e.target) e.target.value = ''
            }}
          />
        </div>

        {error && (
          <div
            className="mx-5 mb-3 px-3 py-2 text-xs rounded"
            style={{ background: 'rgba(237,115,115,0.1)', color: 'var(--red)' }}
          >
            ⚠ {error}
          </div>
        )}

        <div className="overflow-auto px-5 pb-5">
          {files.length === 0 && !busy && (
            <div className="text-xs text-center py-4 italic" style={{ color: 'var(--muted)' }}>
              Inga dokument uppladdade än. RAG-panelen kan inte hitta något att hämta från.
            </div>
          )}
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map(f => (
                <div
                  key={f.filename}
                  className="flex items-center gap-3 px-3 py-2 rounded text-xs"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}
                >
                  <span className="font-mono truncate flex-1" style={{ color: 'var(--ink)' }}>
                    {f.filename}
                  </span>
                  <span className="font-mono shrink-0" style={{ color: 'var(--muted)' }}>
                    {formatBytes(f.size_bytes)}
                  </span>
                  <span
                    className="font-mono shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                  >
                    {f.chunk_count} {f.chunk_count === 1 ? 'chunk' : 'chunks'}
                  </span>
                  {f.error && (
                    <span className="text-xs shrink-0" style={{ color: 'var(--red)' }} title={f.error}>
                      ⚠
                    </span>
                  )}
                  <button
                    onClick={() => deleteFile(f.filename)}
                    disabled={busy}
                    className="shrink-0 w-6 h-6 rounded hover:opacity-80 disabled:opacity-30"
                    style={{ color: 'var(--muted)' }}
                    title="Radera"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024)        return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
