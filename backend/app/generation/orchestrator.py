from typing import AsyncGenerator

from pydantic import BaseModel

from app.llm.prompts import FLUTTER_SYSTEM_PROMPT
from app.llm.providers import get_provider
from app.validation.validators import ValidationResult, validate_dart_code


class GenerationRequest(BaseModel):
    prompt: str
    provider: str = "openai"
    api_key: str
    max_refinement_attempts: int = 3
    temperature: float = 0.7
    max_tokens: int = 2000


class GenerationResult(BaseModel):
    success: bool
    generated_code: str | None
    validation_result: ValidationResult | None
    attempts: int
    errors: list[str]
    provider_used: str


class GenerationOrchestrator:
    def __init__(self) -> None:
        pass

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """Main generation method with refinement loop."""
        provider = get_provider(
            request.provider,
            request.api_key,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        current_prompt = request.prompt
        attempts = 0
        errors: list[str] = []
        while attempts < request.max_refinement_attempts:
            attempts += 1
            try:
                raw_code = await provider.generate(current_prompt, FLUTTER_SYSTEM_PROMPT)
                cleaned_code = self._clean_code(raw_code)
                validation = validate_dart_code(cleaned_code)
                if validation.is_valid:
                    return GenerationResult(
                        success=True,
                        generated_code=cleaned_code,
                        validation_result=validation,
                        attempts=attempts,
                        errors=[],
                        provider_used=request.provider,
                    )
                errors.extend(validation.errors)
                refinement_prompt = (
                    f"The previous code had validation errors:\n"
                    f"{chr(10).join(validation.errors)}\n\n"
                    f"Original request: {request.prompt}\n\n"
                    f"Generate corrected Flutter code that fixes these issues."
                )
                current_prompt = refinement_prompt
            except Exception as e:
                errors.append(str(e))
                break
        return GenerationResult(
            success=False,
            generated_code=None,
            validation_result=None,
            attempts=attempts,
            errors=errors,
            provider_used=request.provider,
        )

    async def generate_stream(self, request: GenerationRequest) -> AsyncGenerator[str, None]:
        """Streaming generation (no refinement)."""
        provider = get_provider(
            request.provider,
            request.api_key,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        async for chunk in provider.generate_stream(request.prompt, FLUTTER_SYSTEM_PROMPT):
            yield chunk

    def _clean_code(self, code: str) -> str:
        """Clean generated code."""
        if code.startswith("```dart"):
            code = code[7:]
        if code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]
        cleaned_lines: list[str] = []
        for line in code.split("\n"):
            stripped = line.lstrip()
            if stripped.startswith("import 'package:flutter/"):
                continue
            if stripped.startswith("import 'dart:"):
                continue
            if "export " in stripped:
                continue
            cleaned_lines.append(line)
        return "\n".join(cleaned_lines).strip()
