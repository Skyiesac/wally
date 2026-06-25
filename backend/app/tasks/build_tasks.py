import asyncio
import json
from datetime import datetime
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time
from typing import Awaitable, Callable

from celery import Task

from app.database import SessionLocal
from app.llm.prompts import BUILD_REPAIR_SYSTEM_PROMPT
from app.llm.providers import get_provider
from app.config import settings
from app.models.app_models import Build, BuildStatus
from app.storage.providers import get_storage_provider
from app.tasks.celery_app import celery_app
from app.validation.validators import validate_dart_code
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
def build_apk(self, build_id: str, ai_provider: str | None = None, ai_api_key: str | None = None) -> dict:
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
        if not result["success"]:
            repair_result = _attempt_ai_build_repair(
                build_id=build_id,
                project_dir=project_dir,
                app_code=build.app.generated_code,
                build_output=f"{result.get('log', '')}\n{result.get('error', '')}",
                ai_provider=ai_provider,
                ai_api_key=ai_api_key,
            )
            if repair_result is not None:
                result = repair_result
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
    _append_build_log(
        build_id,
        "Starting APK build with Docker...\n"
        f"Command: {' '.join(cmd)}\n",
    )
    result = _run_logged_command(build_id, cmd)
    combined_log = result.stdout
    if result.returncode != 0 and "permission denied" in result.stderr.lower():
        sudo_cmd = ["sudo", "-n", *cmd]
        _append_build_log(
            build_id,
            "\nDocker socket permission denied. Retrying with passwordless sudo...\n"
            f"Command: {' '.join(sudo_cmd)}\n",
        )
        result = _run_logged_command(build_id, sudo_cmd)
        combined_log += result.stdout
    if result.returncode != 0 and _local_flutter_available():
        local_cmd = ["sh", "-c", "flutter pub get && flutter build apk --release"]
        _append_build_log(
            build_id,
            "\nDocker build did not complete. Retrying with local Flutter...\n"
            f"Command: {' '.join(local_cmd)}\n",
        )
        result = _run_logged_command(build_id, local_cmd, cwd=project_dir)
        combined_log += result.stdout
    if result.returncode == 0:
        apk_path = f"{project_dir}/build/app/outputs/flutter-apk/app-release.apk"
        size = os.path.getsize(apk_path)
        return {"success": True, "apk_path": apk_path, "apk_size": size, "log": combined_log}
    return {"success": False, "error": result.stderr, "log": combined_log}


def _docker_build_command(project_dir: str) -> list[str]:
    return [
        "docker", "run", "--rm",
        "-v", f"{project_dir}:/workspace",
        "-w", "/workspace",
        "ghcr.io/cirruslabs/flutter:3.16.0",
        "sh", "-c",
        "flutter pub get && flutter build apk --release",
    ]


def _attempt_ai_build_repair(
    build_id: str,
    project_dir: str,
    app_code: str,
    build_output: str,
    ai_provider: str | None,
    ai_api_key: str | None,
) -> dict | None:
    provider_name = ai_provider or settings.DEFAULT_LLM_PROVIDER
    api_key = ai_api_key or _api_key_for_provider(provider_name)
    if not api_key:
        _append_build_log(
            build_id,
            "\nAI repair skipped: no API key available for build repair.\n",
            error=True,
        )
        return None

    _append_build_log(build_id, "\nBuild failed. Asking AI for one focused repair...\n")
    prompt = (
        "Flutter project file: lib/generated_app.dart\n\n"
        "Generated widget code:\n"
        f"{app_code[:12000]}\n\n"
        "Build output:\n"
        f"{build_output[-12000:]}\n\n"
        "Return the JSON repair plan now."
    )
    try:
        provider = get_provider(
            provider_name,
            api_key,
            temperature=0.1,
            max_tokens=min(settings.LLM_MAX_TOKENS, 8192),
        )
        raw = asyncio.run(provider.generate(prompt, BUILD_REPAIR_SYSTEM_PROMPT))
        plan = _parse_repair_plan(raw)
        _append_build_log(build_id, f"AI repair reason: {plan.get('reason', 'No reason provided')}\n")
        if plan["action"] == "replace_generated_code":
            return _apply_ai_code_repair(build_id, project_dir, plan["generated_code"])
        if plan["action"] == "run_commands":
            return _run_ai_commands(build_id, project_dir, plan["commands"])
        _append_build_log(build_id, "AI repair gave up: no narrow safe fix found.\n", error=True)
    except Exception as e:
        _append_build_log(build_id, f"AI repair failed: {e}\n", error=True)
    return None


def _api_key_for_provider(provider_name: str) -> str | None:
    if provider_name == "openai":
        return settings.OPENAI_API_KEY
    if provider_name == "anthropic":
        return settings.ANTHROPIC_API_KEY
    if provider_name == "gemini":
        return settings.GEMINI_API_KEY
    return None


def _parse_repair_plan(raw: str) -> dict:
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if fence_match:
        raw = fence_match.group(1)
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("AI repair response did not contain JSON")
    plan = json.loads(raw[start : end + 1])
    if not isinstance(plan, dict):
        raise ValueError("AI repair plan must be an object")
    action = plan.get("action")
    if action not in {"replace_generated_code", "run_commands", "give_up"}:
        raise ValueError(f"Unsupported AI repair action: {action}")
    return {
        "reason": str(plan.get("reason") or "")[:500],
        "action": action,
        "generated_code": str(plan.get("generated_code") or ""),
        "commands": plan.get("commands") if isinstance(plan.get("commands"), list) else [],
    }


def _apply_ai_code_repair(build_id: str, project_dir: str, generated_code: str) -> dict | None:
    validation = validate_dart_code(generated_code)
    if not validation.is_valid or validation.component_name is None:
        _append_build_log(
            build_id,
            f"AI repair rejected: replacement widget failed validation: {validation.errors}\n",
            error=True,
        )
        return None
    generated_path = Path(project_dir) / "lib" / "generated_app.dart"
    generated_path.write_text(
        "// THIS FILE IS AUTO-GENERATED\n"
        "import 'package:flutter/material.dart';\n"
        "import 'dart:math';\n"
        "import 'dart:async';\n\n"
        f"{generated_code}\n\n"
        "class GeneratedWidget extends StatelessWidget {\n"
        "  const GeneratedWidget({Key? key}) : super(key: key);\n\n"
        "  @override\n"
        "  Widget build(BuildContext context) {\n"
        f"    return const {validation.component_name}();\n"
        "  }\n"
        "}\n"
    )
    _append_build_log(build_id, "Applied AI replacement widget. Rebuilding once...\n")
    return _run_docker_build(build_id, project_dir)


def _run_ai_commands(build_id: str, project_dir: str, commands: list) -> dict | None:
    combined_log = ""
    for command in commands[:4]:
        if not _is_allowed_ai_command(command):
            _append_build_log(build_id, f"AI command rejected: {command}\n", error=True)
            return None
        _append_build_log(build_id, f"Running AI repair command: {' '.join(command)}\n")
        result = _run_logged_command(build_id, command, cwd=project_dir)
        combined_log += result.stdout
        if result.returncode != 0:
            return {"success": False, "error": result.stderr, "log": combined_log}
    return _run_docker_build(build_id, project_dir)


def _is_allowed_ai_command(command: object) -> bool:
    allowed = {
        ("flutter", "clean"),
        ("flutter", "pub", "get"),
        ("flutter", "build", "apk", "--release"),
        ("dart", "format", "lib/generated_app.dart"),
    }
    return isinstance(command, list) and tuple(command) in allowed


def _local_flutter_available() -> bool:
    return shutil.which("flutter") is not None


def _run_logged_command(
    build_id: str,
    cmd: list[str],
    cwd: str | None = None,
    timeout: int = 900,
) -> subprocess.CompletedProcess:
    output: list[str] = []
    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    start = time.monotonic()
    assert process.stdout is not None
    while True:
        line = process.stdout.readline()
        if line:
            output.append(line)
            _append_build_log(build_id, line)
        if process.poll() is not None:
            remaining = process.stdout.read()
            if remaining:
                output.append(remaining)
                _append_build_log(build_id, remaining)
            break
        if time.monotonic() - start > timeout:
            process.kill()
            message = f"\nBuild command timed out after {timeout} seconds.\n"
            output.append(message)
            _append_build_log(build_id, message, error=True)
            return subprocess.CompletedProcess(cmd, 124, "".join(output), message)
    text = "".join(output)
    return subprocess.CompletedProcess(cmd, process.returncode or 0, text, text)


def _append_build_log(build_id: str, text: str, error: bool = False) -> None:
    print(text, end="", flush=True)
    db = SessionLocal()
    try:
        build = db.query(Build).filter(Build.id == build_id).first()
        if build is None:
            return
        if error:
            build.error_log = f"{build.error_log or ''}{text}"
        else:
            build.build_log = f"{build.build_log or ''}{text}"
        db.commit()
    finally:
        db.close()
