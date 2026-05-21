import json
from pathlib import Path
from typing import AsyncIterator

import httpx

from approaches.base import Approach
from lib.metrics import MetricsTracker, estimate_tokens
from lib.pricing import CLOUD_PRICING, cloud_cost_usd

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "data" / "settings.json"

GEMINI_MODEL = "gemini-2.5-flash"


def _api_key() -> str:
    try:
        return json.loads(SETTINGS_FILE.read_text()).get("GEMINI_API_KEY", "").strip()
    except Exception:
        return ""


class ExternalApiApproach(Approach):
    id          = "external_api"
    label       = "Externt API"
    description = f"Molnmodell ({GEMINI_MODEL}) via Google API"
    model       = GEMINI_MODEL

    def info(self) -> dict:
        return {**super().info(), "pricing_per_million_tokens": CLOUD_PRICING.get(GEMINI_MODEL, {})}

    async def run(self, query: str) -> AsyncIterator[dict]:
        api_key = _api_key()
        if not api_key:
            yield {"type": "error", "message": "GEMINI_API_KEY saknas i data/settings.json."}
            return

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:streamGenerateContent?alt=sse&key={api_key}"
        )
        payload = {"contents": [{"role": "user", "parts": [{"text": query}]}]}

        m = MetricsTracker()
        m.set_input_tokens(estimate_tokens(query))
        m.start()

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream("POST", url, json=payload, headers={"Content-Type": "application/json"}) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        yield {"type": "error", "message": f"Gemini {resp.status_code}: {body.decode(errors='replace')[:300]}"}
                        return
                    async for line in resp.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        raw = line[5:].lstrip()
                        if raw == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        for cand in chunk.get("candidates", []):
                            for part in cand.get("content", {}).get("parts", []):
                                token = part.get("text", "")
                                if token:
                                    m.mark_first_token()
                                    m.add_output_tokens(estimate_tokens(token))
                                    yield {"type": "token", "text": token}
        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
            return

        m.finish()
        cost = cloud_cost_usd(GEMINI_MODEL, m.input_tokens, m.output_tokens)
        yield {"type": "done", "metrics": m.to_payload(cost)}
