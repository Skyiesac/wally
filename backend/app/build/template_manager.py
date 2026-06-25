import os
import shutil
from pathlib import Path

from pydantic import BaseModel


class ProjectConfig(BaseModel):
    app_name: str
    package_name: str
    description: str
    generated_code: str
    component_name: str
    version: str
    build_number: int


class TemplateManager:
    def __init__(self, template_dir: str) -> None:
        self.template_dir = template_dir

    def prepare_project(self, config: ProjectConfig, output_dir: str) -> str:
        """Prepare complete Flutter project."""
        os.makedirs(output_dir, exist_ok=True)
        shutil.copytree(self.template_dir, output_dir, dirs_exist_ok=True)
        self._inject_pubspec(config, output_dir)
        self._inject_main_dart(config, output_dir)
        self._inject_generated_code(config, output_dir)
        self._inject_manifest(config, output_dir)
        self._inject_main_activity(config, output_dir)
        self._create_local_properties(output_dir)
        return output_dir

    def _inject_pubspec(self, config: ProjectConfig, project_dir: str) -> None:
        """Update pubspec.yaml with app details."""
        pubspec_path = Path(project_dir) / "pubspec.yaml"
        content = pubspec_path.read_text()
        content = content.replace(
            "{{APP_PACKAGE_NAME}}",
            config.package_name.replace(".", "_").lower(),
        )
        content = content.replace("{{APP_DESCRIPTION}}", config.description)
        content = content.replace(
            "{{APP_VERSION}}+{{BUILD_NUMBER}}",
            f"{config.version}+{config.build_number}",
        )
        pubspec_path.write_text(content)

    def _inject_main_dart(self, config: ProjectConfig, project_dir: str) -> None:
        """Update main.dart with app name."""
        main_path = Path(project_dir) / "lib" / "main.dart"
        content = main_path.read_text()
        content = content.replace("{{APP_NAME}}", config.app_name)
        main_path.write_text(content)

    def _inject_generated_code(self, config: ProjectConfig, project_dir: str) -> None:
        """Inject generated widget code."""
        template_path = Path(project_dir) / "lib" / "generated_app.dart.template"
        content = template_path.read_text()
        content = content.replace("{{COMPONENT_NAME}}", config.component_name)
        content = content.replace("{{GENERATED_CODE}}", config.generated_code)
        output_path = Path(project_dir) / "lib" / "generated_app.dart"
        output_path.write_text(content)
        template_path.unlink()

    def _inject_manifest(self, config: ProjectConfig, project_dir: str) -> None:
        """Update AndroidManifest.xml and app/build.gradle.kts package references.

        AGP 8 uses the ``namespace`` declared in build.gradle.kts instead of the
        manifest ``package`` attribute, so the package name is injected into the
        Kotlin DSL (namespace + applicationId) and only the app label goes into
        the manifest.
        """
        template_path = (
            Path(project_dir) / "android" / "app" / "src" / "main" / "AndroidManifest.xml.template"
        )
        content = template_path.read_text()
        content = content.replace("{{APP_NAME}}", config.app_name)
        output_path = (
            Path(project_dir) / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
        )
        output_path.write_text(content)
        template_path.unlink()

        # namespace and applicationId must match the manifest package.
        build_gradle_path = Path(project_dir) / "android" / "app" / "build.gradle.kts"
        build_gradle = build_gradle_path.read_text()
        build_gradle = build_gradle.replace("{{PACKAGE_NAME}}", config.package_name)
        build_gradle_path.write_text(build_gradle)

    def _inject_main_activity(self, config: ProjectConfig, project_dir: str) -> None:
        """Create MainActivity.kt with the correct Kotlin package."""
        package_name = config.package_name
        package_path = package_name.replace(".", "/")
        kotlin_dir = Path(project_dir) / "android" / "app" / "src" / "main" / "kotlin" / package_path
        kotlin_dir.mkdir(parents=True, exist_ok=True)
        main_activity = f"""package {package_name}

import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {{
}}
"""
        (kotlin_dir / "MainActivity.kt").write_text(main_activity)

    def _create_local_properties(self, project_dir: str) -> None:
        """Create local.properties with Flutter SDK path.

        The value is a placeholder: the Flutter tool rewrites this file with the
        real SDK path before invoking Gradle on every ``flutter build``. It only
        needs to exist so settings.gradle's assert passes.
        """
        local_props = """flutter.sdk=/flutter
flutter.buildMode=release
flutter.versionName=1.0.0
flutter.versionCode=1
"""
        (Path(project_dir) / "android" / "local.properties").write_text(local_props)

    @staticmethod
    def sanitize_package_name(app_id: str) -> str:
        """Convert app ID to a valid Android/Kotlin package name."""
        clean_id = ''.join(c if c.isalnum() else '_' for c in app_id.lower())
        # Java/Kotlin package segments must not start with a digit (UUIDs often do).
        if clean_id and clean_id[0].isdigit():
            clean_id = f"app_{clean_id}"
        return f"com.oggy.generated.{clean_id}"
