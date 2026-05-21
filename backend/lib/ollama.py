import json
import os
from typing import AsyncIterator

import httpx

OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

DEFAULT_OPTIONS = {"num_predict": 512, "num_ctx": 4096, "temperature": 0.7}


async def stream_chat(
    model: str,
    messages: list[dict],
    options: dict | None = None,
) -> AsyncIterator[str]:
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {**DEFAULT_OPTIONS, **(options or {})},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", f"{OLLAMA_BASE}/api/chat", json=payload) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                raise RuntimeError(f"Ollama {resp.status_code}: {body.decode(errors='replace')[:200]}")
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield token
                if chunk.get("done"):
                    return
