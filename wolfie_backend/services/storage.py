"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — services/storage.py                       ║
╠══════════════════════════════════════════════════════════════╣
║  HARDENING:                                                   ║
║  ✅ MIME type validation (magic bytes, not just extension)    ║
║  ✅ Per-context file size limits (product/logo/KYC)          ║
║  ✅ UUID-based filenames — no original name leaked            ║
║  ✅ Optional WebP conversion + compression (via Pillow)       ║
║  ✅ Raises descriptive errors for all policy violations       ║
╚══════════════════════════════════════════════════════════════╝
"""

import io
import os
import uuid
from abc import ABC, abstractmethod

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

import logging
logger = logging.getLogger("wolfie.storage")


# ══════════════════════════════════════════════════════════════
# POLICY CONSTANTS
# ══════════════════════════════════════════════════════════════

#: Allowed MIME types for image uploads
ALLOWED_IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

#: Allowed MIME types for KYC documents
ALLOWED_DOCUMENT_MIMES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}

#: File size limits per upload context (in bytes)
SIZE_LIMITS = {
    "product":  5  * 1024 * 1024,   # 5 MB  — menu item images
    "logo":     2  * 1024 * 1024,   # 2 MB  — restaurant logos
    "proof":    5  * 1024 * 1024,   # 5 MB  — delivery proof photos
    "avatar":   3  * 1024 * 1024,   # 3 MB  — profile avatars
    "receipt":  5  * 1024 * 1024,   # 5 MB  — payment / order receipts
    "kyc":      10 * 1024 * 1024,   # 10 MB — identity / KYC documents
    "default":  5  * 1024 * 1024,   # 5 MB  — fallback
}

#: Extension to MIME mapping (human-readable error context only)
_EXT_MIME_MAP = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".gif":  "image/gif",
    ".pdf":  "application/pdf",
}


# ══════════════════════════════════════════════════════════════
# MIME DETECTION
# ══════════════════════════════════════════════════════════════

def _detect_mime(file_bytes: bytes) -> str:
    """
    Detect MIME type from file magic bytes.
    Falls back to 'application/octet-stream' if python-magic not installed.
    """
    try:
        import magic
        return magic.from_buffer(file_bytes, mime=True)
    except ImportError:
        # Fallback: inspect first bytes manually for common formats
        if file_bytes[:3] == b"\xff\xd8\xff":
            return "image/jpeg"
        if file_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        if file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP":
            return "image/webp"
        if file_bytes[:4] == b"%PDF":
            return "application/pdf"
        return "application/octet-stream"


# ══════════════════════════════════════════════════════════════
# VALIDATION
# ══════════════════════════════════════════════════════════════

def validate_upload(
    file: FileStorage,
    context: str = "default",
    convert_to_webp: bool = False,
) -> tuple[bytes, str, str]:
    """
    Validate, (optionally) compress/convert, and return file data.

    Args:
        file:           Werkzeug FileStorage object.
        context:        Upload context key (product | logo | proof | avatar | receipt | kyc | default).
        convert_to_webp: If True and file is an image, convert to WebP.

    Returns:
        (file_bytes, mime_type, extension)

    Raises:
        ValueError: on policy violations (wrong MIME, too large, etc.)
    """
    if not file or not file.filename:
        raise ValueError("No file provided.")

    # --- Read file content ---
    file_bytes = file.read()
    file.seek(0)  # Reset for callers that might read again

    # --- Size check ---
    size_limit = SIZE_LIMITS.get(context, SIZE_LIMITS["default"])
    if len(file_bytes) > size_limit:
        raise ValueError(
            f"File too large for '{context}' upload: "
            f"{len(file_bytes) // 1024} KB > {size_limit // 1024} KB limit."
        )

    # --- MIME check (magic bytes, not extension) ---
    detected_mime = _detect_mime(file_bytes)
    allowed_mimes = ALLOWED_DOCUMENT_MIMES if context in ("kyc", "receipt") else ALLOWED_IMAGE_MIMES
    if detected_mime not in allowed_mimes:
        raise ValueError(
            f"File type '{detected_mime}' is not allowed for '{context}' uploads. "
            f"Accepted: {', '.join(sorted(allowed_mimes))}"
        )

    # --- Extension derived from actual MIME (not original filename) ---
    mime_to_ext = {
        "image/jpeg":      ".jpg",
        "image/png":       ".png",
        "image/webp":      ".webp",
        "image/gif":       ".gif",
        "application/pdf": ".pdf",
    }
    ext = mime_to_ext.get(detected_mime, ".bin")

    # --- Optional WebP conversion + compression ---
    if convert_to_webp and detected_mime in ALLOWED_IMAGE_MIMES and detected_mime != "image/webp":
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=85, optimize=True)
            file_bytes = buf.getvalue()
            detected_mime = "image/webp"
            ext = ".webp"
            logger.debug(f"Converted upload to WebP (size: {len(file_bytes)} bytes)")
        except ImportError:
            logger.warning("Pillow not installed — skipping WebP conversion.")
        except Exception as e:
            logger.warning(f"WebP conversion failed — keeping original: {e}")

    return file_bytes, detected_mime, ext


# ══════════════════════════════════════════════════════════════
# STORAGE PROVIDERS
# ══════════════════════════════════════════════════════════════

class StorageProvider(ABC):
    @abstractmethod
    def upload(self, file: FileStorage, context: str = "default") -> str:
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, upload_dir: str, base_url: str):
        self.upload_dir = upload_dir
        self.base_url   = base_url.rstrip("/")
        os.makedirs(self.upload_dir, exist_ok=True)

    def upload(self, file: FileStorage, context: str = "default") -> str:
        """Validate, assign UUID filename, and save locally."""
        convert_webp = (context in ("product", "logo", "proof", "avatar"))
        file_bytes, mime_type, ext = validate_upload(file, context=context, convert_to_webp=convert_webp)

        # UUID-based filename — never expose original name
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        filepath        = os.path.join(self.upload_dir, unique_filename)

        with open(filepath, "wb") as f:
            f.write(file_bytes)

        return f"{self.base_url}/uploads/{unique_filename}"


class SupabaseStorageProvider(StorageProvider):
    def __init__(self, supabase_url: str, supabase_key: str, bucket_name: str = "uploads"):
        from supabase import create_client, Client
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.bucket_name      = bucket_name

    def upload(self, file: FileStorage, context: str = "default") -> str:
        """Validate, convert if needed, then push to Supabase Storage."""
        convert_webp = (context in ("product", "logo", "proof", "avatar"))
        file_bytes, mime_type, ext = validate_upload(
            file, context=context, convert_to_webp=convert_webp
        )

        # UUID-based filename
        unique_filename = f"{uuid.uuid4().hex}{ext}"

        try:
            self.supabase.storage.from_(self.bucket_name).upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": mime_type}
            )
        except Exception as e:
            # Attempt to create bucket if it doesn't exist, then retry once
            try:
                self.supabase.storage.create_bucket(self.bucket_name, options={"public": True})
                self.supabase.storage.from_(self.bucket_name).upload(
                    path=unique_filename,
                    file=file_bytes,
                    file_options={"content-type": mime_type}
                )
            except Exception as e_inner:
                raise RuntimeError(f"Supabase upload failed: {e_inner}") from e

        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(unique_filename)
        return public_url


class S3StorageProvider(StorageProvider):
    def __init__(
        self,
        bucket_name: str,
        aws_access_key_id: str = None,
        aws_secret_access_key: str = None,
        region_name: str = "us-east-1",
        endpoint_url: str = None,
        custom_domain: str = None,
    ):
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise RuntimeError("boto3 is required for S3StorageProvider. Please install boto3.")

        self.bucket_name = bucket_name
        self.region_name = region_name or "us-east-1"
        self.custom_domain = custom_domain
        self.endpoint_url = endpoint_url
        
        session = boto3.session.Session()
        self.s3_client = session.client(
            "s3",
            aws_access_key_id=aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=self.region_name,
            endpoint_url=endpoint_url or os.getenv("AWS_S3_ENDPOINT_URL"),
            config=Config(signature_version="s3v4")
        )

    def upload(self, file: FileStorage, context: str = "default") -> str:
        """Validate, convert if needed, then upload to S3/R2."""
        convert_webp = (context in ("product", "logo", "proof", "avatar"))
        file_bytes, mime_type, ext = validate_upload(
            file, context=context, convert_to_webp=convert_webp
        )

        unique_filename = f"{uuid.uuid4().hex}{ext}"

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=file_bytes,
                ContentType=mime_type,
            )
        except Exception as e:
            raise RuntimeError(f"S3 upload failed: {e}") from e

        if self.custom_domain:
            return f"https://{self.custom_domain.rstrip('/')}/{unique_filename}"
        elif self.endpoint_url:
            return f"{self.endpoint_url.rstrip('/')}/{self.bucket_name}/{unique_filename}"
        else:
            return f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{unique_filename}"


# ══════════════════════════════════════════════════════════════
# SINGLETON FACTORY
# ══════════════════════════════════════════════════════════════

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

ENVIRONMENT         = os.getenv("ENVIRONMENT", "development")
RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL", "")

if ENVIRONMENT == "production" or "render.com" in RENDER_EXTERNAL_URL:
    BASE_URL = os.getenv("BASE_URL") or RENDER_EXTERNAL_URL or "https://wolfie-backend-pt9u.onrender.com"
else:
    BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")


def get_storage_provider() -> StorageProvider:
    # 1. AWS S3 / Cloudflare R2 / MinIO
    s3_bucket = os.getenv("AWS_S3_BUCKET") or os.getenv("S3_BUCKET")
    if s3_bucket:
        try:
            return S3StorageProvider(
                bucket_name=s3_bucket,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_REGION", "us-east-1"),
                endpoint_url=os.getenv("AWS_S3_ENDPOINT_URL"),
                custom_domain=os.getenv("AWS_S3_CUSTOM_DOMAIN"),
            )
        except Exception as e:
            logger.warning(f"S3 storage init failed — falling back: {e}")

    # 2. Supabase Storage
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key:
        try:
            return SupabaseStorageProvider(supabase_url, supabase_key)
        except Exception as e:
            logger.warning(f"Supabase storage init failed — falling back to local storage: {e}")

    # 3. Local File Storage
    return LocalStorageProvider(UPLOAD_DIR, BASE_URL)


storage_provider = get_storage_provider()
