import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.schemas import GenerateRequest, GenerationResponse, ValidationResponse
from app.generation.orchestrator import GenerationOrchestrator, GenerationRequest as GenRequest

router = APIRouter(prefix="/api/generation", tags=["generation"])


def to_generation_response(result) -> GenerationResponse:
    """Convert an orchestrator result into the API response schema."""
    validation = None
    if result.validation_result is not None:
        v = result.validation_result
        validation = ValidationResponse(
            is_valid=v.is_valid,
            errors=v.errors,
            warnings=v.warnings,
            component_name=v.component_name,
        )
    return GenerationResponse(
        success=result.success,
        generated_code=result.generated_code,
        validation=validation,
        preview=result.preview_spec,
        attempts=result.attempts,
        errors=result.errors,
    )


@router.post("/generate", response_model=GenerationResponse)
async def generate_code(request: GenerateRequest):
    """Generate Flutter code from prompt."""
    orchestrator = GenerationOrchestrator()
    gen_request = GenRequest(
        prompt=request.prompt,
        provider=request.provider,
        api_key=request.api_key,
    )
    result = await orchestrator.generate(gen_request)
    return to_generation_response(result)


@router.post("/stream")
async def generate_stream(request: GenerateRequest):
    """Stream generation output."""
    orchestrator = GenerationOrchestrator()
    gen_request = GenRequest(
        prompt=request.prompt,
        provider=request.provider,
        api_key=request.api_key,
    )

    async def event_stream():
        async for chunk in orchestrator.generate_stream(gen_request):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
