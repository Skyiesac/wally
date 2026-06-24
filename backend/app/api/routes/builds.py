from datetime import datetime
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.schemas import BuildRequest, BuildResponse
from app.build.template_manager import ProjectConfig, TemplateManager
from app.config import settings
from app.database import get_db
from app.models.app_models import App, Build, BuildStatus, User
from app.storage.providers import get_storage_provider
from app.tasks.build_tasks import build_apk
from app.validation.validators import validate_dart_code

router = APIRouter(prefix="/api/builds", tags=["builds"])


@router.post("", response_model=BuildResponse)
async def create_build(
    request: BuildRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger APK build."""
    app = db.query(App).filter(App.id == request.app_id).first()
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")
    user = db.query(User).filter(User.id == request.user_id).first()
    enforce_build_credits = settings.ENVIRONMENT != "development"
    if enforce_build_credits and (user is None or user.build_credits <= 0):
        raise HTTPException(status_code=402, detail="Insufficient build credits")

    component_name = validate_dart_code(app.generated_code).component_name
    if component_name is None:
        raise HTTPException(
            status_code=422,
            detail="Generated code has no widget class",
        )

    build_id = str(uuid.uuid4())
    latest = (
        db.query(Build)
        .filter(Build.app_id == app.id)
        .order_by(Build.build_number.desc())
        .first()
    )
    build_number = (latest.build_number + 1) if latest is not None else 1
    build = Build(
        id=build_id,
        app_id=app.id,
        user_id=request.user_id,
        status=BuildStatus.PENDING,
        version=request.version,
        build_number=build_number,
        queued_at=datetime.utcnow(),
    )
    project_dir = f"/tmp/builds/{build_id}"
    config = ProjectConfig(
        app_name=app.name,
        package_name=app.package_name,
        description=app.description or "",
        generated_code=app.generated_code,
        component_name=component_name,
        version=request.version,
        build_number=build_number,
    )
    template_manager = TemplateManager("app/build/templates/flutter_template")
    template_manager.prepare_project(config, project_dir)

    build.status = BuildStatus.QUEUED
    if enforce_build_credits and user is not None:
        user.build_credits -= 1
    db.add(build)
    db.commit()
    db.refresh(build)
    if settings.ENVIRONMENT == "development":
        background_tasks.add_task(build_apk.run, build_id)
    else:
        build_apk.delay(build_id)
    return build


@router.get("/{build_id}", response_model=BuildResponse)
async def get_build(build_id: str, db: Session = Depends(get_db)):
    """Get build status."""
    build = db.query(Build).filter(Build.id == build_id).first()
    if build is None:
        raise HTTPException(status_code=404, detail="Build not found")
    response = BuildResponse(
        id=build.id,
        app_id=build.app_id,
        status=build.status.value,
        version=build.version,
        build_number=build.build_number,
        queued_at=build.queued_at,
    )
    if build.status == BuildStatus.SUCCESS and build.apk_path:
        storage = get_storage_provider()
        response.apk_url = await storage.get_file_url(build.apk_path)
    return response


@router.get("/{build_id}/download")
async def download_apk(build_id: str, db: Session = Depends(get_db)):
    """Download APK file."""
    build = db.query(Build).filter(Build.id == build_id).first()
    if build is None or build.status != BuildStatus.SUCCESS or not build.apk_path:
        raise HTTPException(status_code=404, detail="APK not available")
    storage = get_storage_provider()
    local_path = f"/tmp/downloads/{build_id}.apk"
    await storage.download_file(build.apk_path, local_path)
    return FileResponse(
        local_path,
        media_type="application/vnd.android.package-archive",
        filename=f"{build.app.name}.apk",
    )


@router.get("/{build_id}/logs")
async def get_build_logs(build_id: str, db: Session = Depends(get_db)):
    """Get build logs."""
    build = db.query(Build).filter(Build.id == build_id).first()
    if build is None:
        raise HTTPException(status_code=404, detail="Build not found")
    return {"build_log": build.build_log, "error_log": build.error_log}
