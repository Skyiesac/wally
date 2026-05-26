from abc import ABC, abstractmethod
from typing import AsyncGenerator


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str) -> str:
        """Generate a complete response."""
        pass

    @abstractmethod
    async def generate_stream(self, prompt: str, system_prompt: str) -> AsyncGenerator[str, None]:
        """Generate a streaming response."""
        pass
