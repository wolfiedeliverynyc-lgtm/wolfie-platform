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

class SupabaseStorageProvider(StorageProvider):
    def __init__(self, supabase_url: str, supabase_key: str, bucket_name: str = "uploads"):
        from supabase import create_client, Client
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.bucket_name = bucket_name

    def upload(self, file: FileStorage) -> str:
        if not file:
            raise ValueError("No file provided")
        
        filename = secure_filename(file.filename) if file.filename else "upload.jpg"
        ext = os.path.splitext(filename)[1]
        if not ext:
            ext = ".jpg"
            
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        file_content = file.read()
        file.seek(0)
        
        try:
            self.supabase.storage.from_(self.bucket_name).upload(
                path=unique_filename,
                file=file_content,
                file_options={"content-type": file.content_type or "image/jpeg"}
            )
        except Exception as e:
            try:
                self.supabase.storage.create_bucket(self.bucket_name, options={"public": True})
                self.supabase.storage.from_(self.bucket_name).upload(
                    path=unique_filename,
                    file=file_content,
                    file_options={"content-type": file.content_type or "image/jpeg"}
                )
            except Exception as e_inner:
                raise RuntimeError(f"Supabase upload failed: {e_inner}") from e
        
        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(unique_filename)
        return public_url

# Initialize provider based on environment (currently hardcoded to local)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")

# Singleton instance
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if supabase_url and supabase_key:
    try:
        storage_provider = SupabaseStorageProvider(supabase_url, supabase_key)
    except Exception as e:
        storage_provider = LocalStorageProvider(UPLOAD_DIR, BASE_URL)
else:
    storage_provider = LocalStorageProvider(UPLOAD_DIR, BASE_URL)
