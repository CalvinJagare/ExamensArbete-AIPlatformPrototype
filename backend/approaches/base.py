from typing import AsyncIterator


class Approach:
    id: str = ""
    label: str = ""
    description: str = ""
    model: str = ""

    def info(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "description": self.description,
            "model": self.model,
        }

    async def run(self, query: str) -> AsyncIterator[dict]:  # pragma: no cover
        raise NotImplementedError
        yield {}
