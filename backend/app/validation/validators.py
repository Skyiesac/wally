import re

from pydantic import BaseModel

from .patterns import ALLOWED_PACKAGES, FORBIDDEN_IMPORTS, FORBIDDEN_PATTERNS, REQUIRED_PATTERNS

COMPONENT_PATTERN = re.compile(r"class\s+(\w+)\s+extends\s+(StatelessWidget|StatefulWidget)")
DEPENDENCY_PATTERN = re.compile(r"import\s+['\"]package:(\w+)/")


class ValidationResult(BaseModel):
    is_valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    extracted_dependencies: list[str] = []
    component_name: str | None = None


class DartCodeValidator:
    def validate(self, code: str) -> ValidationResult:
        errors: list[str] = []
        errors.extend(self._check_forbidden_imports(code))
        errors.extend(self._check_forbidden_patterns(code))
        errors.extend(self._check_required_patterns(code))
        errors.extend(self._check_structure(code))
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            component_name=self._extract_component_name(code),
            extracted_dependencies=self._extract_dependencies(code),
        )

    def _check_forbidden_imports(self, code: str) -> list[str]:
        return [f"Forbidden import found: {name}" for name in FORBIDDEN_IMPORTS if name in code]

    def _check_forbidden_patterns(self, code: str) -> list[str]:
        return [
            f"Forbidden pattern found: {pattern}"
            for pattern in FORBIDDEN_PATTERNS
            if re.search(pattern, code)
        ]

    def _check_required_patterns(self, code: str) -> list[str]:
        return [
            f"Missing required pattern: {pattern}"
            for pattern in REQUIRED_PATTERNS
            if not re.search(pattern, code)
        ]

    def _extract_component_name(self, code: str) -> str | None:
        match = COMPONENT_PATTERN.search(code)
        return match.group(1) if match else None

    def _extract_dependencies(self, code: str) -> list[str]:
        found = {match.group(1) for match in DEPENDENCY_PATTERN.finditer(code)}
        return sorted(pkg for pkg in found if pkg in ALLOWED_PACKAGES)

    def _check_structure(self, code: str) -> list[str]:
        errors: list[str] = []
        if "return " not in code:
            errors.append("Widget must contain a return statement")
        if len(code) <= 50:
            errors.append("Code is too short")
        return errors


def validate_dart_code(code: str) -> ValidationResult:
    """Convenience function to validate code."""
    return DartCodeValidator().validate(code)
