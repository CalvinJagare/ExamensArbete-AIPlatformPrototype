from typing import AsyncIterator

from approaches.base import Approach
from lib.metrics import MetricsTracker, estimate_tokens
from lib.ollama import stream_chat
from lib.pricing import LOCAL_COST_PER_REQUEST_USD


class LocalOllamaApproach(Approach):
    id          = "local"
    label       = "Lokal modell"
    description = "Ollama-modell utan retrieval eller finjustering"
    model       = "phi3:mini"

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
