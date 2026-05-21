import time
from dataclasses import dataclass, field

from .pricing import monthly_cost_usd


@dataclass
class MetricsTracker:
    _t_start: float = 0.0
    _t_first_token: float | None = None
    _t_end: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    extra: dict = field(default_factory=dict)

    def start(self) -> None:
        self._t_start = time.perf_counter()

    def mark_first_token(self) -> None:
        if self._t_first_token is None:
            self._t_first_token = time.perf_counter()

    def add_output_tokens(self, n: int = 1) -> None:
        self.output_tokens += n

    def set_input_tokens(self, n: int) -> None:
        self.input_tokens = n

    def finish(self) -> None:
        self._t_end = time.perf_counter()

    def latency_ms(self) -> float:
        return (self._t_end - self._t_start) * 1000

    def ttft_ms(self) -> float:
        if self._t_first_token is None:
            return 0.0
        return (self._t_first_token - self._t_start) * 1000

    def tokens_per_sec(self) -> float:
        if self._t_first_token is None or self._t_end <= self._t_first_token:
            return 0.0
        return self.output_tokens / (self._t_end - self._t_first_token)

    def to_payload(self, cost_per_request_usd: float) -> dict:
        return {
            "latency_ms":            round(self.latency_ms(), 1),
            "ttft_ms":               round(self.ttft_ms(), 1),
            "input_tokens":          self.input_tokens,
            "output_tokens":         self.output_tokens,
            "tokens_per_sec":        round(self.tokens_per_sec(), 1),
            "cost_per_request_usd":  round(cost_per_request_usd, 6),
            "cost_per_month_usd":    round(monthly_cost_usd(cost_per_request_usd), 2),
            **self.extra,
        }


def estimate_tokens(text: str) -> int:
    #~4 chars per token
    return max(1, len(text) // 4)
