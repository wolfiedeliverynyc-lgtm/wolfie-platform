import os
import uuid
import shutil
from abc import ABC, abstractmethod
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

class StorageProvider(ABC):
    @abstractmethod
    def upload(self, file: FileStorage) -> str:
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, upload_dir: str, base_url: str):
        self.upload_dir = upload_dir
        self.base_url = base_url
        os.makedirs(self.upload_dir, exist_ok=True)

    def upload(self, file: FileStorage) -> str:
        if not file:
            raise ValueError("No file provided")
        
        filename = secure_filename(file.filename) if file.filename else "upload.jpg"
        ext = os.path.splitext(filename)[1]
        if not ext:
            ext = ".jpg"
            
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.upload_dir, unique_filename)
        
        file.save(filepath)
        
        # Return public URL
        return f"{self.base_url}/uploads/{unique_filename}"

# Initialize provider based on environment (currently hardcoded to local)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")

# Singleton instance
storage_provider = LocalStorageProvider(UPLOAD_DIR, BASE_URL)
