import json
from pathlib import Path
from typing import AsyncIterator

from approaches.base import Approach
from lib.metrics import MetricsTracker, estimate_tokens
from lib.ollama import stream_chat
from lib.pricing import LOCAL_COST_PER_REQUEST_USD

TRAINING_STATS_FILE = Path(__file__).resolve().parent.parent / "data" / "training_stats.json"


def _load_training_stats() -> dict:
    try:
        return json.loads(TRAINING_STATS_FILE.read_text())
    except Exception:
        return {}


class FineTunedApproach(Approach):
    id          = "fine_tuned"
    label       = "Finjusterad modell"
    description = "Lokal modell tränad på domänspecifik data (QLoRA)"
    model       = "file-test:latest"

    def info(self) -> dict:
        return {**super().info(), "training": _load_training_stats()}

    async def run(self, query: str) -> AsyncIterator[dict]:
        m = MetricsTracker()
        m.set_input_tokens(estimate_tokens(query))
        m.start()
        try:
            async for token in stream_chat(self.model, [{"role": "user", "content": query}]):
                m.mark_first_token()
                m.add_output_tokens(estimate_tokens(token))
                yield {"type": "token", "text": token}
        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
            return
        m.finish()
        yield {"type": "done", "metrics": m.to_payload(LOCAL_COST_PER_REQUEST_USD)}
