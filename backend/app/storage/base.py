from abc import ABC, abstractmethod
from pathlib import Path


class StorageProvider(ABC):
    @abstractmethod
    async def upload_file(self, local_path: str, remote_key: str) -> str:
        """Upload file and return access URL"""
        pass

    @abstractmethod
    async def download_file(self, remote_key: str, local_path: str) -> str:
        """Download file to local path"""
        pass

    @abstractmethod
    async def delete_file(self, remote_key: str) -> bool:
        """Delete file"""
        pass

    @abstractmethod
    async def get_file_url(self, remote_key: str) -> str:
        """Get download URL"""
        pass

    @abstractmethod
    async def file_exists(self, remote_key: str) -> bool:
        """Check if file exists"""
        pass
