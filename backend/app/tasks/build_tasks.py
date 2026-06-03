import asyncio
from datetime import datetime
import os
import shutil
import subprocess

from celery import Task

from app.database import SessionLocal
from app.models.app_models import Build, BuildStatus
from app.storage.providers import get_storage_provider
from app.tasks.celery_app import celery_app


class DatabaseTask(Task):
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, max_retries=2)
def build_apk(self, build_id: str) -> dict:
    """Execute Flutter APK build in Docker container."""
    build = self.db.query(Build).filter(Build.id == build_id).first()
    if build is None:
        raise ValueError(f"Build not found: {build_id}")

    build.status = BuildStatus.BUILDING
    build.started_at = datetime.utcnow()
    self.db.commit()

    project_dir = None
    try:
        project_dir = _prepare_build_directory(build_id)
        result = _run_docker_build(build_id, project_dir)
        if result["success"]:
            storage = get_storage_provider()
            remote_key = f"builds/{build_id}/app-release.apk"
            # asyncio.run is safe under the default prefork pool (forked child has no
            # running loop); the solo pool runs inside the worker's loop and would raise.
            asyncio.run(storage.upload_file(result["apk_path"], remote_key))
            build.status = BuildStatus.SUCCESS
            build.apk_path = remote_key
            build.apk_size = result["apk_size"]
            build.build_log = result["log"]
            build.completed_at = datetime.utcnow()
        else:
            raise Exception(result["error"])
    except Exception as e:
        build.status = BuildStatus.FAILED
        build.error_log = str(e)
        self.db.commit()
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60)
    finally:
        if project_dir is not None:
            shutil.rmtree(project_dir, ignore_errors=True)
        self.db.commit()

    return {"build_id": build_id, "status": build.status.value}


def _prepare_build_directory(build_id: str) -> str:
    """Prepare project directory for build."""
    project_dir = f"/tmp/builds/{build_id}"
    os.makedirs(project_dir, exist_ok=True)
    return project_dir


def _run_docker_build(build_id: str, project_dir: str) -> dict:
    """Run Flutter build in Docker container."""
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{project_dir}:/workspace",
        "-w", "/workspace",
        "ghcr.io/cirruslabs/flutter:3.16.0",
        "sh", "-c",
        "flutter pub get && flutter build apk --release",
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=900,
    )
    if result.returncode == 0:
        apk_path = f"{project_dir}/build/app/outputs/flutter-apk/app-release.apk"
        size = os.path.getsize(apk_path)
        return {"success": True, "apk_path": apk_path, "apk_size": size, "log": result.stdout}
    return {"success": False, "error": result.stderr, "log": result.stdout}
