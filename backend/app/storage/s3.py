from __future__ import annotations

import hashlib
import io
import re
from datetime import UTC, datetime
from typing import Any, BinaryIO, Dict, Optional, Tuple
from urllib.parse import urlparse

import boto3
import botocore.client
from botocore.exceptions import ClientError

from app.core.config import settings
from app.storage.base import (
    EvidenceByteStore,
    StorageError,
    StorageImmutabilityViolation,
    StorageIntegrityError,
    StorageNotFoundError,
    StorageObjectMetadata,
    StorageVerificationResult,
)


class S3EvidenceByteStore(EvidenceByteStore):
    """
    S3 / MinIO content-addressed storage (CAS) implementation.
    
    Serves as the authoritative byte repository for forensic evidence in staging
    and production. Strictly enforces SHA-256 CAS addressing, fail-closed immutability,
    streaming bounded-memory transfers, and quarantine isolation.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        secure: Optional[bool] = None,
        addressing_style: str = "path",
        connect_timeout: float = 10.0,
        read_timeout: float = 30.0,
        client: Optional[Any] = None,
    ):
        self.endpoint_url = endpoint_url or settings.S3_ENDPOINT_URL
        self.access_key = access_key or settings.S3_ACCESS_KEY
        self.secret_key = secret_key or settings.S3_SECRET_KEY
        self.bucket_name = bucket_name or settings.S3_BUCKET_NAME
        self.region = region or settings.S3_REGION
        self.secure = secure if secure is not None else getattr(settings, "S3_SECURE", False)
        self.addressing_style = addressing_style

        if client is not None:
            self._client = client
        else:
            cfg = botocore.client.Config(
                signature_version="s3v4",
                s3={"addressing_style": self.addressing_style},
                connect_timeout=connect_timeout,
                read_timeout=read_timeout,
                retries={"max_attempts": 3, "mode": "standard"},
            )
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
                use_ssl=self.secure,
                config=cfg,
            )

    @property
    def client(self) -> Any:
        return self._client

    def _parse_s3_uri(self, uri_or_key: str) -> Tuple[str, str]:
        """Extract (bucket, key) from s3://bucket/key or return (default_bucket, key)."""
        if uri_or_key.startswith("s3://"):
            parsed = urlparse(uri_or_key)
            bucket = parsed.netloc
            key = parsed.path.lstrip("/")
            return bucket, key
        return self.bucket_name, uri_or_key.lstrip("/")

    def compute_cas_key(
        self,
        content_hash: str,
        is_quarantined: bool = False,
        filename: Optional[str] = None,
    ) -> str:
        clean_hash = content_hash.lower().strip()
        shard1 = clean_hash[:2]
        shard2 = clean_hash[2:4]
        prefix = "quarantine" if is_quarantined else "sha256"

        name = f"QUARANTINED_{clean_hash}" if is_quarantined else clean_hash
        if filename:
            # Sanitize filename to prevent directory traversal or invalid S3 key characters
            safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
            name = f"{name}_{safe_name}"

        return f"{prefix}/{shard1}/{shard2}/{name}"

    def put_stream(
        self,
        stream: BinaryIO,
        content_hash: str,
        file_size: int,
        mime_type: str,
        metadata: Optional[Dict[str, str]] = None,
        is_quarantined: bool = False,
        filename: Optional[str] = None,
    ) -> str:
        clean_hash = content_hash.lower().strip()
        key = self.compute_cas_key(clean_hash, is_quarantined=is_quarantined, filename=filename)
        storage_uri = f"s3://{self.bucket_name}/{key}"

        # 1. Immutability check if key already exists on S3/MinIO
        try:
            head_meta = self.client.head_object(Bucket=self.bucket_name, Key=key)
            existing_size = head_meta.get("ContentLength")
            if existing_size is not None and existing_size != file_size:
                raise StorageImmutabilityViolation(
                    f"S3 CAS collision error: Object exists at '{storage_uri}' "
                    f"with size {existing_size} bytes vs declared {file_size} bytes."
                )

            # Verify that incoming stream matches declared content hash
            hasher = hashlib.sha256()
            stream_bytes = 0
            if stream.seekable():
                stream.seek(0)
            while True:
                chunk = stream.read(65536)
                if not chunk:
                    break
                hasher.update(chunk)
                stream_bytes += len(chunk)
            if stream.seekable():
                stream.seek(0)

            computed_stream_hash = hasher.hexdigest().lower()
            if computed_stream_hash != clean_hash:
                raise StorageIntegrityError(
                    f"Supplied stream hash '{computed_stream_hash}' does not match declared hash '{clean_hash}'."
                )
            if stream_bytes != file_size:
                raise StorageIntegrityError(
                    f"Supplied stream size {stream_bytes} does not match declared size {file_size}."
                )

            existing_custom = head_meta.get("Metadata", {})
            existing_hash = existing_custom.get("content-hash") or existing_custom.get("sha256")

            if existing_hash and existing_hash.lower() == clean_hash:
                # Idempotent write: verified identical content already stored
                return storage_uri

            # Verify by streaming bytes if metadata absent
            verify_res = self.verify(storage_uri, clean_hash)
            if verify_res.verified:
                return storage_uri
            else:
                raise StorageImmutabilityViolation(
                    f"S3 CAS collision error: Object exists at '{storage_uri}' "
                    f"with differing hash '{verify_res.storage_hash}' vs expected '{clean_hash}'."
                )

        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "")
            if err_code not in ("404", "NoSuchKey", "NotFound"):
                raise StorageError(f"Error checking object existence on S3: {e}")

        # 2. Prepare S3 user-defined metadata
        s3_metadata: Dict[str, str] = {
            "content-hash": clean_hash,
            "mime-type": mime_type,
            "file-size": str(file_size),
            "ingested-at": datetime.now(UTC).isoformat(),
        }
        if metadata:
            for k, v in metadata.items():
                s3_metadata[k.lower().replace("_", "-")] = str(v)

        # 3. Stream upload in bounded chunks
        if stream.seekable():
            stream.seek(0)

        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=stream,
                ContentType=mime_type,
                Metadata=s3_metadata,
            )
        except Exception as e:
            raise StorageIntegrityError(f"Failed to upload artifact stream to S3: {e}")

        # 4. Immediate post-write verification
        verify_res = self.verify(storage_uri, clean_hash if not is_quarantined else "")
        if not is_quarantined and not verify_res.verified:
            # Attempt compensating cleanup of corrupted write
            self.delete_if_uncommitted(storage_uri)
            raise StorageIntegrityError(
                f"Post-write integrity verification failed for '{storage_uri}': {verify_res.error}"
            )

        return storage_uri

    def get_stream(self, storage_uri_or_key: str) -> BinaryIO:
        bucket, key = self._parse_s3_uri(storage_uri_or_key)
        try:
            response = self.client.get_object(Bucket=bucket, Key=key)
            return response["Body"]
        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "")
            if err_code in ("404", "NoSuchKey", "NotFound"):
                raise StorageNotFoundError(f"Object '{key}' not found in bucket '{bucket}'")
            raise StorageError(f"Failed to fetch stream from S3: {e}")

    def get_bytes(self, storage_uri_or_key: str) -> bytes:
        stream = self.get_stream(storage_uri_or_key)
        try:
            return stream.read()
        finally:
            if hasattr(stream, "close"):
                stream.close()

    def head(self, storage_uri_or_key: str) -> Optional[StorageObjectMetadata]:
        bucket, key = self._parse_s3_uri(storage_uri_or_key)
        try:
            res = self.client.head_object(Bucket=bucket, Key=key)
            custom = res.get("Metadata", {})
            return StorageObjectMetadata(
                content_hash=custom.get("content-hash") or "",
                size_bytes=res.get("ContentLength", 0),
                mime_type=res.get("ContentType", "application/octet-stream"),
                storage_uri=f"s3://{bucket}/{key}",
                created_at=res.get("LastModified", datetime.now(UTC)).isoformat(),
                etag=res.get("ETag", "").strip('"'),
                custom_metadata=custom,
            )
        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "")
            if err_code in ("404", "NoSuchKey", "NotFound"):
                return None
            raise StorageError(f"S3 HEAD error on '{key}': {e}")

    def exists(self, storage_uri_or_key: str) -> bool:
        bucket, key = self._parse_s3_uri(storage_uri_or_key)
        try:
            self.client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "")
            if err_code in ("404", "NoSuchKey", "NotFound"):
                return False
            raise StorageError(f"S3 exists error on '{key}': {e}")

    def verify(self, storage_uri_or_key: str, expected_hash: str) -> StorageVerificationResult:
        bucket, key = self._parse_s3_uri(storage_uri_or_key)
        clean_expected = expected_hash.lower().strip() if expected_hash else ""

        try:
            response = self.client.get_object(Bucket=bucket, Key=key)
            stream = response["Body"]
        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "")
            if err_code in ("404", "NoSuchKey", "NotFound"):
                return StorageVerificationResult(
                    verified=False,
                    recorded_hash=clean_expected,
                    storage_hash=None,
                    size_bytes=0,
                    error=f"Object '{key}' missing on S3 bucket '{bucket}'",
                )
            return StorageVerificationResult(
                verified=False,
                recorded_hash=clean_expected,
                storage_hash=None,
                size_bytes=0,
                error=f"S3 access error during verify: {e}",
            )

        hasher = hashlib.sha256()
        total_bytes = 0
        try:
            while True:
                chunk = stream.read(65536)
                if not chunk:
                    break
                hasher.update(chunk)
                total_bytes += len(chunk)
        finally:
            if hasattr(stream, "close"):
                stream.close()

        computed_hash = hasher.hexdigest().lower()
        is_match = (computed_hash == clean_expected) if clean_expected else True
        err = None if is_match else f"Hash mismatch: storage={computed_hash} != expected={clean_expected}"

        return StorageVerificationResult(
            verified=is_match,
            recorded_hash=clean_expected,
            storage_hash=computed_hash,
            size_bytes=total_bytes,
            error=err,
        )

    def quarantine(
        self,
        stream: BinaryIO,
        content_hash: str,
        file_size: int,
        mime_type: str,
        reason: str,
        metadata: Optional[Dict[str, str]] = None,
        filename: Optional[str] = None,
    ) -> str:
        q_meta = dict(metadata or {})
        q_meta["quarantine-reason"] = reason
        q_meta["quarantined-at"] = datetime.now(UTC).isoformat()

        return self.put_stream(
            stream=stream,
            content_hash=content_hash,
            file_size=file_size,
            mime_type=mime_type,
            metadata=q_meta,
            is_quarantined=True,
            filename=filename,
        )

    def delete_if_uncommitted(self, storage_uri_or_key: str) -> bool:
        bucket, key = self._parse_s3_uri(storage_uri_or_key)
        try:
            self.client.delete_object(Bucket=bucket, Key=key)
            return True
        except ClientError:
            return False

    def health_check(self) -> Dict[str, Any]:
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            return {
                "status": "HEALTHY",
                "backend": "s3",
                "bucket": self.bucket_name,
                "endpoint": self.endpoint_url,
                "region": self.region,
            }
        except Exception as e:
            return {
                "status": "UNHEALTHY",
                "backend": "s3",
                "bucket": self.bucket_name,
                "endpoint": self.endpoint_url,
                "error": str(e),
            }

    def ensure_bucket_exists(self) -> None:
        """Create bucket if not existing (safe idempotent bootstrap for dev/test)."""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "")
            if err_code in ("404", "NoSuchBucket", "NotFound"):
                kwargs: Dict[str, Any] = {"Bucket": self.bucket_name}
                if self.region and self.region != "us-east-1":
                    kwargs["CreateBucketConfiguration"] = {"LocationConstraint": self.region}
                self.client.create_bucket(**kwargs)
            else:
                raise
