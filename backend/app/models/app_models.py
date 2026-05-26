import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class BuildStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    BUILDING = "BUILDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String, unique=True)
    build_credits: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    apps: Mapped[list["App"]] = relationship(back_populates="user")


class App(Base):
    __tablename__ = "apps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    original_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    generated_code: Mapped[str] = mapped_column(Text, nullable=False)
    dependencies: Mapped[list] = mapped_column(JSON, default=list)
    package_name: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="apps")
    versions: Mapped[list["AppVersion"]] = relationship(back_populates="app")
    builds: Mapped[list["Build"]] = relationship(back_populates="app")


class AppVersion(Base):
    __tablename__ = "app_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    app_id: Mapped[str] = mapped_column(ForeignKey("apps.id"))
    version_number: Mapped[int] = mapped_column(Integer)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    generated_code: Mapped[str] = mapped_column(Text, nullable=False)
    generation_metadata: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    app: Mapped["App"] = relationship(back_populates="versions")


class Build(Base):
    __tablename__ = "builds"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    app_id: Mapped[str] = mapped_column(ForeignKey("apps.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[BuildStatus] = mapped_column(
        Enum(BuildStatus), default=BuildStatus.PENDING
    )
    version: Mapped[str] = mapped_column(String)
    build_number: Mapped[int] = mapped_column(Integer)
    apk_path: Mapped[str | None] = mapped_column(String, nullable=True)
    apk_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    build_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    queued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    app: Mapped["App"] = relationship(back_populates="builds")
