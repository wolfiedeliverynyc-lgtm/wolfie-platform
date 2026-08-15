"""
WOLFIE DELIVERY — tests/test_storage_engine.py
Unit tests for multi-cloud Storage Providers, MIME validation, and context size policies.
"""

import io
import os
import uuid
import pytest
from unittest.mock import MagicMock, patch
from werkzeug.datastructures import FileStorage
from services.storage import (
    validate_upload,
    LocalStorageProvider,
    S3StorageProvider,
    SupabaseStorageProvider,
    SIZE_LIMITS,
    UPLOAD_DIR
)


def _make_dummy_image(format="JPEG", size_bytes=1024):
    """Generate dummy valid image bytes with real magic headers."""
    if format.upper() == "JPEG":
        header = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    elif format.upper() == "PNG":
        header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    elif format.upper() == "PDF":
        header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    elif format.upper() == "WEBP":
        header = b"RIFF\x24\x00\x00\x00WEBPVP8 "
    else:
        header = b"\x00\x00\x00\x00"

    padding = b"A" * max(0, size_bytes - len(header))
    return header + padding


class TestStorageEngine:

    def test_validate_upload_valid_jpeg(self):
        content = _make_dummy_image("JPEG", 2048)
        fs = FileStorage(stream=io.BytesIO(content), filename="photo.jpg", content_type="image/jpeg")
        data, mime, ext = validate_upload(fs, context="product")
        assert mime == "image/jpeg"
        assert ext == ".jpg"
        assert len(data) == len(content)

    def test_validate_upload_valid_png(self):
        content = _make_dummy_image("PNG", 2048)
        fs = FileStorage(stream=io.BytesIO(content), filename="logo.png", content_type="image/png")
        data, mime, ext = validate_upload(fs, context="logo")
        assert mime == "image/png"
        assert ext == ".png"

    def test_validate_upload_pdf_in_kyc_allowed(self):
        content = _make_dummy_image("PDF", 2048)
        fs = FileStorage(stream=io.BytesIO(content), filename="passport.pdf", content_type="application/pdf")
        data, mime, ext = validate_upload(fs, context="kyc")
        assert mime == "application/pdf"
        assert ext == ".pdf"

    def test_validate_upload_pdf_in_product_disallowed(self):
        content = _make_dummy_image("PDF", 2048)
        fs = FileStorage(stream=io.BytesIO(content), filename="menu.pdf", content_type="application/pdf")
        with pytest.raises(ValueError, match="is not allowed for 'product'"):
            validate_upload(fs, context="product")

    def test_validate_upload_mime_spoofing_rejected(self):
        # Text file masquerading as .jpg
        fake_content = b"This is plain text and not a real jpeg file."
        fs = FileStorage(stream=io.BytesIO(fake_content), filename="hacker.jpg", content_type="image/jpeg")
        with pytest.raises(ValueError, match="is not allowed"):
            validate_upload(fs, context="product")

    def test_validate_upload_size_limit_exceeded(self):
        # Exceed logo 2MB limit (e.g. 3MB)
        oversized = _make_dummy_image("PNG", 3 * 1024 * 1024)
        fs = FileStorage(stream=io.BytesIO(oversized), filename="big_logo.png", content_type="image/png")
        with pytest.raises(ValueError, match="File too large for 'logo'"):
            validate_upload(fs, context="logo")

    def test_local_storage_provider(self, tmp_path):
        upload_dir = str(tmp_path / "uploads")
        provider = LocalStorageProvider(upload_dir=upload_dir, base_url="http://localhost:5000")
        
        content = _make_dummy_image("JPEG", 1024)
        fs = FileStorage(stream=io.BytesIO(content), filename="delivery_proof.jpg", content_type="image/jpeg")
        
        url = provider.upload(fs, context="proof")
        assert url.startswith("http://localhost:5000/uploads/")
        
        # Verify file is saved in upload_dir
        saved_filename = url.split("/")[-1]
        saved_path = os.path.join(upload_dir, saved_filename)
        assert os.path.exists(saved_path)
        with open(saved_path, "rb") as f:
            assert f.read() == content

    def test_s3_storage_provider(self):
        mock_boto3 = MagicMock()
        mock_botocore_config = MagicMock()
        mock_session = MagicMock()
        mock_client = MagicMock()
        mock_boto3.session.Session.return_value = mock_session
        mock_session.client.return_value = mock_client

        with patch.dict("sys.modules", {"boto3": mock_boto3, "botocore": MagicMock(), "botocore.config": mock_botocore_config}):
            provider = S3StorageProvider(
                bucket_name="wolfie-media-bucket",
                aws_access_key_id="test_key",
                aws_secret_access_key="test_secret",
                region_name="us-east-1",
            )
            
            content = _make_dummy_image("PNG", 1024)
            fs = FileStorage(stream=io.BytesIO(content), filename="dish.png", content_type="image/png")
            
            url = provider.upload(fs, context="product")
            
            assert "wolfie-media-bucket.s3.us-east-1.amazonaws.com" in url
            mock_client.put_object.assert_called_once()
            call_kwargs = mock_client.put_object.call_args[1]
            assert call_kwargs["Bucket"] == "wolfie-media-bucket"
            assert call_kwargs["ContentType"] == "image/png"
