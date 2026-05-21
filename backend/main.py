import json
import os
import re
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from approaches.base import Approach
from approaches.external_api import ExternalApiApproach
from approaches.fine_tuned import FineTunedApproach
from approaches.local_ollama import LocalOllamaApproach
from approaches.rag import RagApproach
from lib.indexer import (
    ALLOWED_SUFFIXES,
    CORPUS_DIR,
    list_corpus_with_counts,
    rebuild_index,
)

DATA_DIR = Path(__file__).resolve().parent / "data"
PROMPTS_FILE = DATA_DIR / "prompts.json"

OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

#approach registry
APPROACHES: list[Approach] = [
    ExternalApiApproach(),
    RagApproach(),
    FineTunedApproach(),
    LocalOllamaApproach(),
]

APPROACH_BY_ID: dict[str, Approach] = {a.id: a for a in APPROACHES}


app = FastAPI(title="SkolPresentation Demo")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    query: str


@app.get("/health")
async def health() -> dict:
    ollama_ok = False
    models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            if resp.status_code == 200:
                ollama_ok = True
                models = [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        pass
    return {"ollama_ok": ollama_ok, "ollama_models": models}


@app.get("/approaches")
async def list_approaches() -> list[dict]:
    return [a.info() for a in APPROACHES]


@app.get("/prompts")
async def list_prompts() -> list[dict]:
    try:
        return json.loads(PROMPTS_FILE.read_text())
    except Exception:
        return []


@app.get("/corpus")
async def get_corpus() -> dict:
    return list_corpus_with_counts()


_SAFE_NAME = re.compile(r"[^A-Za-z0-9._\-]+")


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = _SAFE_NAME.sub("_", base).strip(".")
    return cleaned or "untitled"


@app.post("/corpus")
async def upload_corpus(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Filtyp {suffix!r} stöds inte. Tillåtna: {', '.join(ALLOWED_SUFFIXES)}",
        )
    name = _safe_filename(file.filename or "untitled" + suffix)
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    target = CORPUS_DIR / name
    target.write_bytes(await file.read())
    return rebuild_index()


@app.delete("/corpus/{filename}")
async def delete_corpus(filename: str) -> dict:
    name = _safe_filename(filename)
    target = CORPUS_DIR / name
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Filen {name!r} finns inte")
    target.unlink()
    return rebuild_index()


@app.post("/run/{approach_id}")
async def run_approach(approach_id: str, body: RunRequest):
    approach = APPROACH_BY_ID.get(approach_id)
    if approach is None:
        raise HTTPException(status_code=404, detail=f"Unknown approach: {approach_id}")

    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Empty query")

    async def generate():
        try:
            async for event in approach.run(query):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
