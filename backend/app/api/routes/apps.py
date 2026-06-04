from datetime import datetime
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.routes.generation import to_generation_response
from app.api.schemas import AppResponse, CreateAppRequest, GenerationResponse, RefineAppRequest
from app.build.template_manager import TemplateManager
from app.database import get_db
from app.generation.orchestrator import GenerationOrchestrator, GenerationRequest as GenRequest
from app.models.app_models import App, AppVersion, Build

router = APIRouter(prefix="/api/apps", tags=["apps"])


@router.post("", response_model=AppResponse)
async def create_app(request: CreateAppRequest, db: Session = Depends(get_db)):
    """Create new app."""
    app_id = str(uuid.uuid4())
    app = App(
        id=app_id,
        user_id=request.user_id,
        name=request.name,
        description=request.description,
        original_prompt=request.prompt,
        generated_code=request.generated_code,
        package_name=TemplateManager.sanitize_package_name(app_id),
    )
    db.add(app)
    db.add(
        AppVersion(
            id=str(uuid.uuid4()),
            app_id=app.id,
            version_number=1,
            prompt=request.prompt,
            generated_code=request.generated_code,
        )
    )
    db.commit()
    db.refresh(app)
    return app


@router.get("", response_model=List[AppResponse])
async def list_apps(user_id: str, db: Session = Depends(get_db)):
    """List user's apps."""
    return (
        db.query(App)
        .filter(App.user_id == user_id)
        .order_by(App.created_at.desc())
        .all()
    )


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(app_id: str, db: Session = Depends(get_db)):
    """Get app details."""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")
    return app


@router.put("/{app_id}/refine", response_model=GenerationResponse)
async def refine_app(app_id: str, request: RefineAppRequest, db: Session = Depends(get_db)):
    """Refine existing app."""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")
    combined_prompt = (
        f"Modify this Flutter code:\n{app.generated_code}\n\n"
        f"User request: {request.refinement_prompt}"
    )
    orchestrator = GenerationOrchestrator()
    gen_request = GenRequest(
        prompt=combined_prompt,
        provider=request.provider,
        api_key=request.api_key,
    )
    result = await orchestrator.generate(gen_request)
    if result.success and result.generated_code is not None:
        app.generated_code = result.generated_code
        app.updated_at = datetime.utcnow()
        version_count = (
            db.query(AppVersion).filter(AppVersion.app_id == app.id).count()
        )
        db.add(
            AppVersion(
                id=str(uuid.uuid4()),
                app_id=app.id,
                version_number=version_count + 1,
                prompt=combined_prompt,
                generated_code=result.generated_code,
            )
        )
        db.commit()
    return to_generation_response(result)


@router.delete("/{app_id}")
async def delete_app(app_id: str, db: Session = Depends(get_db)):
    """Delete app."""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")
    db.query(Build).filter(Build.app_id == app_id).delete()
    db.query(AppVersion).filter(AppVersion.app_id == app_id).delete()
    db.delete(app)
    db.commit()
    return {"message": "App deleted"}
