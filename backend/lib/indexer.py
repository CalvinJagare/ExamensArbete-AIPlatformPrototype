import json
from pathlib import Path

BACKEND_DIR  = Path(__file__).resolve().parent.parent
CORPUS_DIR   = BACKEND_DIR / "data" / "corpus"
CHUNKS_FILE  = BACKEND_DIR / "data" / "chunks.json"

CHUNK_WORDS   = 400
OVERLAP_WORDS = 50

ALLOWED_SUFFIXES = (".md", ".txt", ".pdf")


def chunk_text(text: str, size: int = CHUNK_WORDS, overlap: int = OVERLAP_WORDS) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += size - overlap
    return chunks


def parse_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in (".txt", ".md"):
        return path.read_text(errors="replace")
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n\n".join((p.extract_text() or "") for p in reader.pages)
    raise ValueError(f"Unsupported file type: {suffix}")


def list_corpus_files() -> list[Path]:
    if not CORPUS_DIR.exists():
        return []
    return sorted(p for p in CORPUS_DIR.iterdir() if p.suffix.lower() in ALLOWED_SUFFIXES)


def rebuild_index() -> dict:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    summary: list[dict] = []
    for path in list_corpus_files():
        try:
            text = parse_file(path)
            chunks = chunk_text(text)
        except Exception as exc:
            summary.append({
                "filename":    path.name,
                "size_bytes":  path.stat().st_size,
                "chunk_count": 0,
                "error":       str(exc),
            })
            continue
        for c in chunks:
            records.append({"text": c, "source": path.name})
        summary.append({
            "filename":    path.name,
            "size_bytes":  path.stat().st_size,
            "chunk_count": len(chunks),
        })
    CHUNKS_FILE.write_text(json.dumps(records, ensure_ascii=False))
    return {"files": summary, "total_chunks": len(records)}


def list_corpus_with_counts() -> dict:
    if not CHUNKS_FILE.exists():
        return rebuild_index()
    try:
        records = json.loads(CHUNKS_FILE.read_text())
    except Exception:
        records = []
    by_source: dict[str, int] = {}
    for r in records:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1
    summary: list[dict] = []
    for path in list_corpus_files():
        summary.append({
            "filename":    path.name,
            "size_bytes":  path.stat().st_size,
            "chunk_count": by_source.get(path.name, 0),
        })
    return {"files": summary, "total_chunks": sum(s["chunk_count"] for s in summary)}
