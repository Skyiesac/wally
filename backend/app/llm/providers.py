from typing import AsyncGenerator

from anthropic import AsyncAnthropic
from google import generativeai as genai
from openai import AsyncOpenAI

from .base import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4-turbo-preview",
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    async def generate(self, prompt: str, system_prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            raise ValueError(f"OpenAI generation failed: {e}") from e

    async def generate_stream(self, prompt: str, system_prompt: str) -> AsyncGenerator[str, None]:
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            raise ValueError(f"OpenAI streaming failed: {e}") from e


class AnthropicProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-sonnet-20240229",
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    async def generate(self, prompt: str, system_prompt: str) -> str:
        try:
            response = await self.client.messages.create(
                model=self.model,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return "".join(block.text for block in response.content if block.type == "text")
        except Exception as e:
            raise ValueError(f"Anthropic generation failed: {e}") from e

    async def generate_stream(self, prompt: str, system_prompt: str) -> AsyncGenerator[str, None]:
        try:
            stream = await self.client.messages.create(
                model=self.model,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True,
            )
            async for event in stream:
                if event.type == "content_block_delta":
                    yield event.delta.text
        except Exception as e:
            raise ValueError(f"Anthropic streaming failed: {e}") from e


class GeminiProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-pro",
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
        self.temperature = temperature
        self.max_tokens = max_tokens

    async def generate(self, prompt: str, system_prompt: str) -> str:
        try:
            response = await self.model.generate_content_async(
                f"{system_prompt}\n\n{prompt}",
                generation_config={
                    "temperature": self.temperature,
                    "max_output_tokens": self.max_tokens,
                },
            )
            return response.text
        except Exception as e:
            raise ValueError(f"Gemini generation failed: {e}") from e

    async def generate_stream(self, prompt: str, system_prompt: str) -> AsyncGenerator[str, None]:
        try:
            stream = await self.model.generate_content_async(
                f"{system_prompt}\n\n{prompt}",
                generation_config={
                    "temperature": self.temperature,
                    "max_output_tokens": self.max_tokens,
                },
                stream=True,
            )
            async for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            raise ValueError(f"Gemini streaming failed: {e}") from e


def get_provider(provider_name: str, api_key: str, **kwargs) -> LLMProvider:
    """Factory function returning provider instance."""
    providers = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "gemini": GeminiProvider,
    }
    if provider_name not in providers:
        raise ValueError(f"Unknown provider: {provider_name}")
    return providers[provider_name](api_key, **kwargs)
