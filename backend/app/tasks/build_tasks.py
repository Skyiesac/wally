import asyncio
from datetime import datetime
import os
import shutil
import subprocess
import threading
from typing import Awaitable, Callable

from celery import Task

from app.database import SessionLocal
from app.models.app_models import Build, BuildStatus
from app.storage.providers import get_storage_provider
from app.tasks.celery_app import celery_app
from app.websocket.manager import ws_manager


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
    _fire_and_forget(
        lambda: ws_manager.send_personal_message(
            {"type": "build_started", "build_id": build_id}, build.user_id
        )
    )

    project_dir = None
    try:
        project_dir = _prepare_build_directory(build_id)
        result = _run_docker_build(build_id, project_dir)
        if result["success"]:
            storage = get_storage_provider()
            remote_key = f"builds/{build_id}/app-release.apk"
            _run_async(lambda: storage.upload_file(result["apk_path"], remote_key))
            build.status = BuildStatus.SUCCESS
            build.apk_path = remote_key
            build.apk_size = result["apk_size"]
            build.build_log = result["log"]
            build.completed_at = datetime.utcnow()
            _fire_and_forget(
                lambda: _notify_build_complete(storage, build_id, build.user_id, build.apk_path)
            )
        else:
            raise Exception(result["error"])
    except Exception as e:
        build.status = BuildStatus.FAILED
        build.error_log = str(e)
        self.db.commit()
        _fire_and_forget(
            lambda: ws_manager.send_personal_message(
                {"type": "build_failed", "build_id": build_id, "error": build.error_log},
                build.user_id,
            )
        )
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60)
    finally:
        if project_dir is not None:
            shutil.rmtree(project_dir, ignore_errors=True)
        self.db.commit()

    return {"build_id": build_id, "status": build.status.value}


def _run_async(coro_factory: Callable[[], Awaitable[None]]) -> None:
    """Run a coroutine to completion from sync context.

    Uses asyncio.run when no loop is running (default prefork pool); otherwise
    executes it on a dedicated thread with its own loop (solo pool, in-loop calls).
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(coro_factory())
        return
    result: dict[str, Exception] = {}

    def worker() -> None:
        try:
            asyncio.run(coro_factory())
        except Exception as e:
            result["exc"] = e

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    thread.join()
    if "exc" in result:
        raise result["exc"]


def _fire_and_forget(coro_factory: Callable[[], Awaitable[None]]) -> None:
    """Dispatch a notification without blocking the task.

    Uses asyncio.create_task when a loop is running (solo pool, in-loop calls),
    and asyncio.run when there is none (default prefork pool).
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        _run_async(coro_factory)
    else:
        loop.create_task(coro_factory())


async def _notify_build_complete(storage, build_id: str, user_id: str, apk_path: str) -> None:
    download_url = await storage.get_file_url(apk_path)
    await ws_manager.send_personal_message(
        {"type": "build_complete", "build_id": build_id, "download_url": download_url},
        user_id,
    )


def _prepare_build_directory(build_id: str) -> str:
    """Prepare project directory for build."""
    project_dir = f"/tmp/builds/{build_id}"
    os.makedirs(project_dir, exist_ok=True)
    return project_dir


def _run_docker_build(build_id: str, project_dir: str) -> dict:
    """Run Flutter build in Docker container."""
    cmd = _docker_build_command(project_dir)
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=900,
    )
    if result.returncode != 0 and "permission denied" in result.stderr.lower():
        result = subprocess.run(
            ["sudo", "-n", *cmd],
            capture_output=True,
            text=True,
            timeout=900,
        )
    if result.returncode == 0:
        apk_path = f"{project_dir}/build/app/outputs/flutter-apk/app-release.apk"
        size = os.path.getsize(apk_path)
        return {"success": True, "apk_path": apk_path, "apk_size": size, "log": result.stdout}
    return {"success": False, "error": result.stderr, "log": result.stdout}


def _docker_build_command(project_dir: str) -> list[str]:
    return [
        "docker", "run", "--rm",
        "-v", f"{project_dir}:/workspace",
        "-w", "/workspace",
        "ghcr.io/cirruslabs/flutter:3.16.0",
        "sh", "-c",
        "flutter pub get && flutter build apk --release",
    ]
