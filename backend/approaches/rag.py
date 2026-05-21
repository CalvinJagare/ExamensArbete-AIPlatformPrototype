import json
import re
from pathlib import Path
from typing import AsyncIterator

from approaches.base import Approach
from lib.metrics import MetricsTracker, estimate_tokens
from lib.ollama import stream_chat
from lib.pricing import LOCAL_COST_PER_REQUEST_USD

CHUNKS_FILE = Path(__file__).resolve().parent.parent / "data" / "chunks.json"

TOP_K = 3
MIN_TERM_OVERLAP = 1

#bilingual stopwords
_STOPWORDS = {
    "och", "att", "det", "som", "den", "har", "vad", "vilken", "vilket", "hur",
    "när", "var", "ett", "för", "till", "med", "från", "ska", "kan", "men",
    "vi", "du", "jag", "han", "hon", "de", "min", "din", "sin", "är", "var",
    "the", "and", "are", "for", "with", "what", "which", "how", "when", "where",
    "this", "that", "these", "those", "from", "have", "has", "had", "was", "were",
    "but", "not", "all", "any", "some", "more", "most", "does", "did", "you",
}

SYSTEM_PROMPT = (
    "Du är en assistent som svarar utifrån de medföljande dokumentutdragen. "
    "Om svaret inte finns i utdragen, säg det. Citera relevanta delar när det går."
)


def _load_index() -> tuple[list[dict], object | None]:
    try:
        records = json.loads(CHUNKS_FILE.read_text())
    except Exception:
        return [], None
    if not records:
        return [], None
    from rank_bm25 import BM25Okapi
    tokenized = [r["text"].lower().split() for r in records]
    return records, BM25Okapi(tokenized)


#mtime-keyed cache
_cache: dict = {"mtime": 0.0, "records": [], "index": None}


def _index() -> tuple[list[dict], object | None]:
    try:
        mtime = CHUNKS_FILE.stat().st_mtime
    except FileNotFoundError:
        return [], None
    if mtime != _cache["mtime"]:
        records, idx = _load_index()
        _cache.update(mtime=mtime, records=records, index=idx)
    return _cache["records"], _cache["index"]


def _retrieve(query: str, top_k: int = TOP_K) -> list[dict]:
    records, idx = _index()
    if idx is None or not records:
        return []
    scores = idx.get_scores(query.lower().split())
    ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
    return [
        {"text": records[i]["text"], "source": records[i]["source"], "score": round(float(scores[i]), 3)}
        for i in ranked
    ]


def _meaningful_terms(text: str) -> set[str]:
    return {
        w for w in re.findall(r"\w+", text.lower(), re.UNICODE)
        if len(w) >= 3 and w not in _STOPWORDS
    }


def _is_relevant(query: str, chunks: list[dict]) -> bool:
    q_terms = _meaningful_terms(query)
    if not q_terms:
        return False
    c_terms = _meaningful_terms(" ".join(c["text"] for c in chunks))
    return len(q_terms & c_terms) >= MIN_TERM_OVERLAP


class RagApproach(Approach):
    id          = "rag"
    label       = "RAG"
    description = "Lokal modell + BM25-sökning över egna dokument"
    model       = "phi3:mini"

    async def run(self, query: str) -> AsyncIterator[dict]:
        chunks = _retrieve(query)

        #drop unrelated matches
        if chunks and not _is_relevant(query, chunks):
            chunks = []

        yield {"type": "rag_retrieved", "chunks": chunks}

        if not chunks:
            yield {"type": "done", "skipped": True}
            return

        context = "\n\n---\n\n".join(c["text"] for c in chunks)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\nDokumentutdrag:\n\n" + context},
            {"role": "user",   "content": query},
        ]

        prompt_tokens = estimate_tokens(messages[0]["content"]) + estimate_tokens(query)
        m = MetricsTracker()
        m.set_input_tokens(prompt_tokens)
        m.extra["retrieved_chunks"] = len(chunks)
        m.start()
        try:
            async for token in stream_chat(self.model, messages):
                m.mark_first_token()
                m.add_output_tokens(estimate_tokens(token))
                yield {"type": "token", "text": token}
        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
            return
        m.finish()
        yield {"type": "done", "metrics": m.to_payload(LOCAL_COST_PER_REQUEST_USD)}
