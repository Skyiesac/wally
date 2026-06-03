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
REQUIRED_PATTERNS = [
    r"class\s+\w+\s+extends\s+(StatelessWidget|StatefulWidget)",
    r"@override\s+Widget\s+build",
]

# Allowed packages (dictionary: package_name -> version)
ALLOWED_PACKAGES = {
    "flutter": "sdk",
    "cupertino_icons": "^1.0.2",
}
