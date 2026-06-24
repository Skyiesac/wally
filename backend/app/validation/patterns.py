# Forbidden imports (list of strings)
FORBIDDEN_IMPORTS = [
    "package:http",
    "package:dio",
    "package:path_provider",
    "package:sqflite",
    "package:shared_preferences",
    "dart:io",
    "dart:ffi",
    "package:url_launcher",
]

# Forbidden code patterns (list of regex pattern strings)
FORBIDDEN_PATTERNS = [
    r"MethodChannel\(",
    r"platform\.invokeMethod",
    r"Process\.run",
    r"File\(",
    r"Directory\(",
    r"HttpClient",
    r"Socket\(",
]

# Required patterns (list of regex pattern strings)
# Keep the widget parent strict: the build template only ships flutter +
# cupertino_icons, so Consumer*/Hook* variants would validate but fail to
# build. The class pattern tolerates Dart 3 class modifiers (final/base/
# sealed/interface/abstract) that models frequently emit. The build-method
# pattern requires Widget build(...) to exist — @override is optional in
# Dart and models omit it, so it is checked separately as a warning.
REQUIRED_PATTERNS = [
    r"(?:(?:final|base|sealed|interface|abstract|mixin)\s+)*class\s+\w+(?:<[^>]+>)?\s+extends\s+(StatelessWidget|StatefulWidget)\b",
    r"Widget\s+build\s*(?:<[^>]+>)?\s*\(",
]

# Human-readable labels for REQUIRED_PATTERNS — used in error messages and the
# refinement prompt, so the model and the user never see raw regexes.
REQUIRED_PATTERN_LABELS = {
    REQUIRED_PATTERNS[0]: "a widget class that extends StatelessWidget or StatefulWidget",
    REQUIRED_PATTERNS[1]: "a Widget build(...) method",
}

# Allowed packages (dictionary: package_name -> version)
ALLOWED_PACKAGES = {
    "flutter": "sdk",
    "cupertino_icons": "^1.0.2",
}
