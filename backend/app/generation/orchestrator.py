import json
import re
from copy import deepcopy
from typing import AsyncGenerator

from pydantic import BaseModel

from app.config import settings
from app.llm.prompts import FLUTTER_SYSTEM_PROMPT, PREVIEW_SYSTEM_PROMPT
from app.llm.providers import get_provider
from app.validation.validators import ValidationResult, validate_dart_code


class GenerationRequest(BaseModel):
    prompt: str
    provider: str = "openai"
    api_key: str
    max_refinement_attempts: int = 3
    temperature: float = 0.7
    # Low output budgets frequently truncate complex widgets before build(...).
    max_tokens: int = settings.LLM_MAX_TOKENS


class GenerationResult(BaseModel):
    success: bool
    generated_code: str | None
    validation_result: ValidationResult | None
    preview_spec: dict | None = None
    attempts: int
    errors: list[str]
    provider_used: str


ALLOWED_ELEMENT_TYPES = {"text", "stat", "list", "input", "progress", "image", "button"}
ALLOWED_ACTION_EFFECTS = {"navigate", "append", "toggle", "increment", "decrement"}
WIDGET_CLASS_START_PATTERN = re.compile(
    r"(?:(?:final|base|sealed|interface|abstract|mixin)\s+)*class\s+\w+(?:<[^>]+>)?\s+extends\s+"
    r"(?:StatelessWidget|StatefulWidget)\b"
)


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
                    preview_spec = await self._generate_preview_spec(
                        provider=provider,
                        prompt=request.prompt,
                        generated_code=cleaned_code,
                        component_name=validation.component_name,
                    )
                    return GenerationResult(
                        success=True,
                        generated_code=cleaned_code,
                        validation_result=validation,
                        preview_spec=preview_spec,
                        attempts=attempts,
                        errors=[],
                        provider_used=request.provider,
                    )
                # TEMP DIAGNOSTIC — dump raw output for failed attempts so we can
                # see exactly what the model returned. Remove once stable.
                self._dump_failure(raw_code, cleaned_code, validation.errors, request.provider, attempts)
                errors.extend(validation.errors)
                truncation_hint = ""
                if any("Widget build(...) method" in error for error in validation.errors):
                    truncation_hint = (
                        "\nThe previous response appears incomplete or too long: it did not include "
                        "a Widget build(BuildContext context) method. Generate a shorter COMPLETE "
                        "widget under 250 lines. Prefer a single StatelessWidget and StatefulBuilder. "
                        "Put @override Widget build(BuildContext context) near the top of the class.\n"
                    )
                refinement_prompt = (
                    f"The previous code had validation errors:\n"
                    f"{chr(10).join(validation.errors)}\n\n"
                    f"{truncation_hint}\n"
                    f"Original request: {request.prompt}\n\n"
                    f"Generate corrected Flutter code that fixes these issues."
                )
                current_prompt = refinement_prompt
            except Exception as e:
                errors.append(str(e))
                break
        fallback_code = self._fallback_flutter_widget(request.prompt)
        fallback_validation = validate_dart_code(fallback_code)
        if fallback_validation.is_valid:
            fallback_validation.warnings.append(
                "AI output was incomplete after retries; returned a compact local fallback widget."
            )
            return GenerationResult(
                success=True,
                generated_code=fallback_code,
                validation_result=fallback_validation,
                preview_spec=self._fallback_preview_spec(
                    request.prompt,
                    fallback_validation.component_name,
                ),
                attempts=attempts,
                errors=[],
                provider_used=request.provider,
            )
        return GenerationResult(
            success=False,
            generated_code=None,
            validation_result=fallback_validation,
            preview_spec=None,
            attempts=attempts,
            errors=errors or fallback_validation.errors,
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

    @staticmethod
    def _dump_failure(
        raw_code: str,
        cleaned_code: str,
        errors: list[str],
        provider: str,
        attempts: int,
    ) -> None:
        """Temporary diagnostic: write failed generation output to a file."""
        try:
            with open("/tmp/wally_raw_output.log", "a") as f:
                f.write(f"\n=== attempt {attempts} ({provider}) ===\n")
                f.write(f"ERRORS: {errors}\n")
                f.write(f"RAW:\n{raw_code}\n\n")
                f.write(f"CLEANED:\n{cleaned_code}\n")
        except Exception:
            pass

    async def _generate_preview_spec(
        self,
        provider,
        prompt: str,
        generated_code: str,
        component_name: str | None,
    ) -> dict:
        """Build the interactive preview plan.

        The preview comes from a second LLM call so the frontend can render an
        interactive mockup. If that call fails (network, parsing, safety), fall
        back to a small hand-built spec derived from the prompt/component so the
        review step ALWAYS has something interactive to show.
        """
        preview_prompt = (
            f"User prompt:\n{prompt}\n\n"
            f"Flutter widget class: {component_name or 'Unknown'}\n\n"
            f"Generated Flutter code:\n{generated_code[:6000]}\n\n"
            f"Return the JSON preview plan now."
        )
        try:
            raw_preview = await provider.generate(preview_prompt, PREVIEW_SYSTEM_PROMPT)
            parsed = self._parse_json_object(raw_preview)
            spec = self._sanitize_preview_spec(parsed)
            if spec:
                return spec
        except Exception:
            pass
        return self._fallback_preview_spec(prompt, component_name)

    @staticmethod
    def _fallback_preview_spec(prompt: str, component_name: str | None) -> dict:
        """Minimal interactive preview when the LLM preview call fails."""
        title = (
            component_name.replace("_", " ").strip().title()
            if component_name
            else "My App"
        )[:40]
        return {
            "app_name": title,
            "theme": {"primary_color": "#7c3f2d", "accent_color": "#f0ebe3"},
            "screens": [
                {
                    "id": "home",
                    "title": title,
                    "subtitle": (prompt[:100] + ("…" if len(prompt) > 100 else "")),
                    "elements": [
                        {
                            "id": "intro_text",
                            "type": "text",
                            "label": "Welcome",
                            "value": (prompt[:200] + ("…" if len(prompt) > 200 else "")),
                        },
                        {"id": "counter", "type": "stat", "label": "Counter", "value": "0"},
                    ],
                    "actions": [
                        {
                            "id": "tap_counter",
                            "label": "Tap to count",
                            "effect": "increment",
                            "target": "counter",
                        }
                    ],
                }
            ],
        }

    @staticmethod
    def _fallback_flutter_widget(prompt: str) -> str:
        title = GenerationOrchestrator._dart_string(
            (prompt.strip().splitlines()[0] if prompt.strip() else "Generated App")[:48]
        )
        summary = GenerationOrchestrator._dart_string(
            (prompt.strip() or "Your generated app is ready.")[:220]
        )
        return f"""class GeneratedPromptApp extends StatelessWidget {{
  const GeneratedPromptApp({{Key? key}}) : super(key: key);

  @override
  Widget build(BuildContext context) {{
    int taps = 0;
    return Scaffold(
      backgroundColor: const Color(0xFFF7F2EA),
      appBar: AppBar(
        title: const Text({title}),
        backgroundColor: const Color(0xFF5B5A3C),
        foregroundColor: Colors.white,
      ),
      body: StatefulBuilder(
        builder: (BuildContext context, StateSetter setState) {{
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Generated Preview',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF8A5A44),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          {summary},
                          style: const TextStyle(
                            fontSize: 20,
                            height: 1.3,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF25211D),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Interactions: $taps',
                          style: const TextStyle(
                            fontSize: 16,
                            color: Color(0xFF5C5A52),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () => setState(() => taps++),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8A5A44),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text('Tap to interact'),
                  ),
                ],
              ),
            ),
          );
        }},
      ),
    );
  }}
}}"""

    @staticmethod
    def _dart_string(value: str) -> str:
        escaped = value.replace("\\", "\\\\").replace("'", "\\'")
        escaped = escaped.replace("\r", " ").replace("\n", " ")
        return f"'{escaped}'"

    @staticmethod
    def _parse_json_object(raw: str) -> dict:
        fence_match = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
        if fence_match:
            raw = fence_match.group(1)
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("Preview response did not contain a JSON object")
        parsed = json.loads(raw[start : end + 1])
        if not isinstance(parsed, dict):
            raise ValueError("Preview response must be a JSON object")
        return parsed

    @staticmethod
    def _clean_id(value: object, fallback: str) -> str:
        text = re.sub(r"[^a-z0-9_]+", "_", str(value or "").lower()).strip("_")
        return text or fallback

    def _sanitize_preview_spec(self, raw: dict) -> dict | None:
        spec = deepcopy(raw)
        theme = spec.get("theme") if isinstance(spec.get("theme"), dict) else {}
        screens = spec.get("screens") if isinstance(spec.get("screens"), list) else []
        clean_screens: list[dict] = []

        for screen_index, screen in enumerate(screens[:3]):
            if not isinstance(screen, dict):
                continue
            screen_id = self._clean_id(screen.get("id"), f"screen_{screen_index + 1}")
            elements = screen.get("elements") if isinstance(screen.get("elements"), list) else []
            actions = screen.get("actions") if isinstance(screen.get("actions"), list) else []
            clean_elements: list[dict] = []
            clean_actions: list[dict] = []

            for element_index, element in enumerate(elements[:5]):
                if not isinstance(element, dict):
                    continue
                element_type = str(element.get("type") or "text").lower()
                if element_type not in ALLOWED_ELEMENT_TYPES:
                    element_type = "text"
                items = element.get("items") if isinstance(element.get("items"), list) else []
                clean_elements.append(
                    {
                        "id": self._clean_id(element.get("id"), f"element_{element_index + 1}"),
                        "type": element_type,
                        "label": str(element.get("label") or "")[:80],
                        "value": str(element.get("value") or "")[:120],
                        "items": [str(item)[:80] for item in items[:6]],
                    }
                )

            for action_index, action in enumerate(actions[:3]):
                if not isinstance(action, dict):
                    continue
                effect = str(action.get("effect") or "append").lower()
                if effect not in ALLOWED_ACTION_EFFECTS:
                    effect = "append"
                clean_actions.append(
                    {
                        "id": self._clean_id(action.get("id"), f"action_{action_index + 1}"),
                        "label": str(action.get("label") or "Action")[:40],
                        "effect": effect,
                        "target": self._clean_id(action.get("target"), screen_id),
                    }
                )

            if clean_elements:
                clean_screens.append(
                    {
                        "id": screen_id,
                        "title": str(screen.get("title") or "Preview")[:50],
                        "subtitle": str(screen.get("subtitle") or "")[:100],
                        "elements": clean_elements,
                        "actions": clean_actions,
                    }
                )

        if not clean_screens:
            return None

        return {
            "app_name": str(spec.get("app_name") or clean_screens[0]["title"])[:50],
            "theme": {
                "primary_color": str(theme.get("primary_color") or "#6750A4")[:16],
                "accent_color": str(theme.get("accent_color") or "#EADDFF")[:16],
            },
            "screens": clean_screens,
        }

    def _clean_code(self, code: str) -> str:
        """Clean generated code: unwrap markdown fences/wrapper text, drop imports."""
        # Models often wrap the answer in ```dart fences, sometimes with a
        # leading explanation. Extract the first fenced block when present.
        fence_match = re.search(r"```(?:dart|flutter)?\s*(.*?)```", code, re.DOTALL)
        if fence_match:
            code = fence_match.group(1)
        else:
            # No fence: drop any prose/comment text before the first import or class
            import_match = re.search(r"import\s+['\"]", code)
            class_match = WIDGET_CLASS_START_PATTERN.search(code)
            matches = [match for match in (import_match, class_match) if match]
            start_match = min(matches, key=lambda match: match.start()) if matches else None
            if start_match:
                code = code[start_match.start():]
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
