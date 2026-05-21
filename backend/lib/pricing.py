#USD per 1M tokens
CLOUD_PRICING: dict[str, dict[str, float]] = {
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},
}

LOCAL_COST_PER_REQUEST_USD = 0.0

DEFAULT_REQS_PER_DAY = 1000


def cloud_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    p = CLOUD_PRICING.get(model)
    if not p:
        return 0.0
    return (input_tokens * p["input"] + output_tokens * p["output"]) / 1_000_000


def monthly_cost_usd(per_request_usd: float, reqs_per_day: int = DEFAULT_REQS_PER_DAY) -> float:
    return per_request_usd * reqs_per_day * 30
