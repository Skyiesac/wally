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
        """Update AndroidManifest.xml."""
        template_path = (
            Path(project_dir) / "android" / "app" / "src" / "main" / "AndroidManifest.xml.template"
        )
        content = template_path.read_text()
        content = content.replace("{{APP_NAME}}", config.app_name)
        content = content.replace("{{PACKAGE_NAME}}", config.package_name)
        output_path = (
            Path(project_dir) / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
        )
        output_path.write_text(content)
        template_path.unlink()

    @staticmethod
    def sanitize_package_name(app_id: str) -> str:
        """Convert app ID to valid package name."""
        return f"com.name.generated.{app_id.replace('-', '_')}"
