from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime


# Request schemas
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)
    provider: str = Field(default="openai")
    api_key: str = Field(..., min_length=10)
    user_id: str


class CreateAppRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="")
    prompt: str
    generated_code: str
    component_name: str
    user_id: str


class RefineAppRequest(BaseModel):
    refinement_prompt: str = Field(..., min_length=10, max_length=2000)
    provider: str = Field(default="openai")
    api_key: str


class BuildRequest(BaseModel):
    app_id: str
    user_id: str
    version: str = Field(default="1.0.0")


# Response schemas
class ValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    component_name: Optional[str]


class GenerationResponse(BaseModel):
    success: bool
    generated_code: Optional[str]
    validation: Optional[ValidationResponse]
    preview: Optional[Dict[str, Any]] = None
    attempts: int
    errors: List[str]


class AppResponse(BaseModel):
    id: str
    name: str
    description: str
    original_prompt: str
    package_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class BuildResponse(BaseModel):
    id: str
    app_id: str
    status: str
    version: str
    build_number: int
    queued_at: datetime
    apk_url: Optional[str] = None

    class Config:
        from_attributes = True
