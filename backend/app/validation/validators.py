import re

from pydantic import BaseModel

from .patterns import (
    ALLOWED_PACKAGES,
    FORBIDDEN_IMPORTS,
    FORBIDDEN_PATTERNS,
    REQUIRED_PATTERN_LABELS,
    REQUIRED_PATTERNS,
)

# Mirrors REQUIRED_PATTERNS' class pattern so component_name is extracted even
# when the model emits Dart 3 class modifiers (final/sealed/base/etc).
COMPONENT_PATTERN = re.compile(
    r"(?:(?:final|base|sealed|interface|abstract|mixin)\s+)*class\s+(\w+)(?:<[^>]+>)?\s+extends\s+(StatelessWidget|StatefulWidget)\b"
)
BUILD_METHOD_PATTERN = re.compile(r"Widget\s+build\s*(?:<[^>]+>)?\s*\(")
DEPENDENCY_PATTERN = re.compile(r"import\s+['\"]package:(\w+)/")
COMMENT_OR_STRING_PATTERN = re.compile(
    r"//.*?$|/\*.*?\*/|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"",
    re.DOTALL | re.MULTILINE,
)


class ValidationResult(BaseModel):
    is_valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    extracted_dependencies: list[str] = []
    component_name: str | None = None


class DartCodeValidator:
    def validate(self, code: str) -> ValidationResult:
        errors: list[str] = []
        warnings: list[str] = []
        errors.extend(self._check_forbidden_imports(code))
        errors.extend(self._check_forbidden_patterns(code))
        errors.extend(self._check_required_patterns(code))
        errors.extend(self._check_structure(code))
        # @override is optional in Dart; warn (not fail) when build exists but
        # the annotation is missing.
        if BUILD_METHOD_PATTERN.search(code) and "@override" not in code:
            warnings.append("Missing @override on build method (optional in Dart, recommended)")
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            component_name=self._extract_component_name(code),
            extracted_dependencies=self._extract_dependencies(code),
        )

    def _check_forbidden_imports(self, code: str) -> list[str]:
        return [f"Forbidden import found: {name}" for name in FORBIDDEN_IMPORTS if name in code]

    def _check_forbidden_patterns(self, code: str) -> list[str]:
        executable_code = self._strip_comments_and_strings(code)
        return [
            f"Forbidden pattern found: {pattern}"
            for pattern in FORBIDDEN_PATTERNS
            if re.search(pattern, executable_code)
        ]

    def _check_required_patterns(self, code: str) -> list[str]:
        return [
            f"Missing required pattern: {REQUIRED_PATTERN_LABELS.get(pattern, pattern)}"
            for pattern in REQUIRED_PATTERNS
            if not re.search(pattern, code)
        ]

    def _check_structure(self, code: str) -> list[str]:
        errors: list[str] = []
        # Accept explicit 'return ...' or arrow-body methods (e.g. 'build(...) => ...')
        if "return " not in code and "=>" not in code:
            errors.append("Widget must contain a return statement")
        if len(code) <= 50:
            errors.append("Code is too short")
        return errors

    def _extract_component_name(self, code: str) -> str | None:
        match = COMPONENT_PATTERN.search(code)
        return match.group(1) if match else None

    def _extract_dependencies(self, code: str) -> list[str]:
        found = {match.group(1) for match in DEPENDENCY_PATTERN.finditer(code)}
        return sorted(pkg for pkg in found if pkg in ALLOWED_PACKAGES)

    def _strip_comments_and_strings(self, code: str) -> str:
        return COMMENT_OR_STRING_PATTERN.sub("", code)


def validate_dart_code(code: str) -> ValidationResult:
    """Convenience function to validate code."""
    return DartCodeValidator().validate(code)
