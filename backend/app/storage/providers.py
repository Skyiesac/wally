import shutil
from pathlib import Path

from app.config import settings

from .base import StorageProvider


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def upload_file(self, local_path: str, remote_key: str) -> str:
        destination = self.base_path / remote_key
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_path, destination)
        return remote_key

    async def download_file(self, remote_key: str, local_path: str) -> str:
        source = self.base_path / remote_key
        if not source.exists():
            raise FileNotFoundError(f"File not found: {remote_key}")
        destination = Path(local_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        return local_path

    async def delete_file(self, remote_key: str) -> bool:
        path = self.base_path / remote_key
        if path.exists():
            path.unlink()
            return True
        return False

    async def get_file_url(self, remote_key: str) -> str:
        return f"/api/downloads/{remote_key}"

    async def file_exists(self, remote_key: str) -> bool:
        return (self.base_path / remote_key).exists()


class S3StorageProvider(StorageProvider):
    def __init__(self, bucket: str, endpoint_url: str, access_key: str, secret_key: str):
        raise NotImplementedError("S3 storage will be implemented in future checkpoint")

    async def upload_file(self, local_path: str, remote_key: str) -> str:
        raise NotImplementedError()

    async def download_file(self, remote_key: str, local_path: str) -> str:
        raise NotImplementedError()

    async def delete_file(self, remote_key: str) -> bool:
        raise NotImplementedError()

    async def get_file_url(self, remote_key: str) -> str:
        raise NotImplementedError()

    async def file_exists(self, remote_key: str) -> bool:
        raise NotImplementedError()


def get_storage_provider() -> StorageProvider:
    """Factory function returning configured storage provider."""
    if settings.STORAGE_TYPE == "local":
        return LocalStorageProvider(settings.LOCAL_STORAGE_PATH)
    elif settings.STORAGE_TYPE == "s3":
        if not all([
            settings.S3_BUCKET_NAME,
            settings.S3_ENDPOINT_URL,
            settings.S3_ACCESS_KEY,
            settings.S3_SECRET_KEY,
        ]):
            raise ValueError("S3 configuration incomplete")
        return S3StorageProvider(
            bucket=settings.S3_BUCKET_NAME,
            endpoint_url=settings.S3_ENDPOINT_URL,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
        )
    else:
        raise ValueError(f"Unknown storage type: {settings.STORAGE_TYPE}")
