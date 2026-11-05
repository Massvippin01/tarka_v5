"""TARKA Adaptive Runtime & Environment Capability Discovery Engine.

Detects host operating system, hardware resources (CPU, RAM, GPU),
storage capabilities, network connectivity, and determines the optimal
deployment profile among the 9 canonical institutional profiles.
"""

from __future__ import annotations

import os
import platform
import shutil
import socket
import sys
from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class DeploymentProfileEnum(str, Enum):
    WORKSTATION_STANDALONE = "WORKSTATION_STANDALONE"
    LAPTOP_FIELD_INVESTIGATOR = "LAPTOP_FIELD_INVESTIGATOR"
    LAB_FORENSIC_BENCH = "LAB_FORENSIC_BENCH"
    CENTRAL_AGENCY_CLUSTER = "CENTRAL_AGENCY_CLUSTER"
    INTER_AGENCY_FEDERATION = "INTER_AGENCY_FEDERATION"
    AIR_GAPPED_JUDICIAL_VAULT = "AIR_GAPPED_JUDICIAL_VAULT"
    EDGE_STATION_KIOSK = "EDGE_STATION_KIOSK"
    DISASTER_RECOVERY_NODE = "DISASTER_RECOVERY_NODE"
    COMPETITION_EVALUATOR_REPRO = "COMPETITION_EVALUATOR_REPRO"


@dataclass
class HardwareProfile:
    os_name: str
    os_version: str
    architecture: str
    python_version: str
    cpu_cores_logical: int
    cpu_cores_physical: int
    ram_total_gb: float
    disk_free_gb: float
    gpu_available: bool
    gpu_backend: Optional[str] = None
    is_air_gapped: bool = False


@dataclass
class RuntimeCapabilityDescriptor:
    profile: DeploymentProfileEnum
    hardware: HardwareProfile
    supports_z3_mus: bool
    supports_live_s3: bool
    supports_psi: bool
    supports_zk_proof: bool
    supports_bft_consensus: bool
    recommended_batch_size: int
    worker_concurrency: int
    storage_tier: str


class RuntimeCapabilityDiscovery:
    """Discovers host resources and assigns optimal adaptive runtime profile."""

    @classmethod
    def discover_hardware(cls) -> HardwareProfile:
        os_name = platform.system()
        os_version = platform.release()
        arch = platform.machine()
        py_ver = sys.version.split()[0]
        logical_cores = os.cpu_count() or 4
        physical_cores = max(1, logical_cores // 2) if logical_cores > 1 else 1

        # RAM estimation (cross-platform fallback)
        ram_gb = 8.0
        try:
            import psutil
            ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 2)
            physical_cores = psutil.cpu_count(logical=False) or physical_cores
        except ImportError:
            pass

        # Disk free space
        try:
            total, used, free = shutil.disk_usage(os.getcwd())
            disk_free_gb = round(free / (1024 ** 3), 2)
        except Exception:
            disk_free_gb = 50.0

        # GPU detection
        gpu_avail = False
        gpu_backend = None
        try:
            import torch
            if torch.cuda.is_available():
                gpu_avail = True
                gpu_backend = f"CUDA ({torch.cuda.get_device_name(0)})"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                gpu_avail = True
                gpu_backend = "Apple Silicon MPS"
        except ImportError:
            pass

        # Air-gap detection (probe non-blocking socket to local gateway or DNS)
        is_air_gapped = False
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.2)
            s.connect(("8.8.8.8", 53))
            s.close()
        except Exception:
            is_air_gapped = True

        return HardwareProfile(
            os_name=os_name,
            os_version=os_version,
            architecture=arch,
            python_version=py_ver,
            cpu_cores_logical=logical_cores,
            cpu_cores_physical=physical_cores,
            ram_total_gb=ram_gb,
            disk_free_gb=disk_free_gb,
            gpu_available=gpu_avail,
            gpu_backend=gpu_backend,
            is_air_gapped=is_air_gapped,
        )

    @classmethod
    def determine_profile(
        cls,
        override_profile: Optional[str] = None,
    ) -> RuntimeCapabilityDescriptor:
        hw = cls.discover_hardware()

        if override_profile and override_profile in DeploymentProfileEnum.__members__:
            selected = DeploymentProfileEnum[override_profile]
        elif os.getenv("TARKA_DEPLOYMENT_PROFILE"):
            env_prof = os.getenv("TARKA_DEPLOYMENT_PROFILE", "").upper()
            selected = DeploymentProfileEnum[env_prof] if env_prof in DeploymentProfileEnum.__members__ else DeploymentProfileEnum.COMPETITION_EVALUATOR_REPRO
        elif os.getenv("CI") or os.getenv("GITHUB_ACTIONS"):
            selected = DeploymentProfileEnum.COMPETITION_EVALUATOR_REPRO
        elif hw.is_air_gapped and hw.ram_total_gb >= 16:
            selected = DeploymentProfileEnum.AIR_GAPPED_JUDICIAL_VAULT
        elif hw.ram_total_gb <= 8.5:
            selected = DeploymentProfileEnum.LAPTOP_FIELD_INVESTIGATOR
        elif hw.ram_total_gb >= 32 and hw.cpu_cores_logical >= 8:
            selected = DeploymentProfileEnum.CENTRAL_AGENCY_CLUSTER
        else:
            selected = DeploymentProfileEnum.WORKSTATION_STANDALONE

        # Configure capability limits based on profile
        if selected == DeploymentProfileEnum.LAPTOP_FIELD_INVESTIGATOR:
            concurrency = 2
            batch_size = 500
            storage = "LOCAL_FILESYSTEM_CAS"
        elif selected == DeploymentProfileEnum.AIR_GAPPED_JUDICIAL_VAULT:
            concurrency = 4
            batch_size = 2000
            storage = "IMMUTABLE_READ_ONLY_CAS"
        elif selected in (DeploymentProfileEnum.CENTRAL_AGENCY_CLUSTER, DeploymentProfileEnum.INTER_AGENCY_FEDERATION):
            concurrency = max(4, hw.cpu_cores_logical)
            batch_size = 5000
            storage = "DISTRIBUTED_S3_MINIO_CAS"
        else:
            concurrency = 4
            batch_size = 2500
            storage = "HYBRID_CAS_S3_FALLBACK"

        return RuntimeCapabilityDescriptor(
            profile=selected,
            hardware=hw,
            supports_z3_mus=True,
            supports_live_s3=not hw.is_air_gapped,
            supports_psi=True,
            supports_zk_proof=True,
            supports_bft_consensus=True,
            recommended_batch_size=batch_size,
            worker_concurrency=concurrency,
            storage_tier=storage,
        )


if __name__ == "__main__":
    desc = RuntimeCapabilityDiscovery.determine_profile()
    print("TARKA Runtime Capability Discovery:")
    print(f"Assigned Profile: {desc.profile.value}")
    print(f"OS: {desc.hardware.os_name} {desc.hardware.os_version} ({desc.hardware.architecture})")
    print(f"CPU: {desc.hardware.cpu_cores_logical} cores | RAM: {desc.hardware.ram_total_gb} GB")
    print(f"Air-gapped: {desc.hardware.is_air_gapped}")
    print(f"Storage Tier: {desc.storage_tier}")
    print(f"Batch Size: {desc.recommended_batch_size} records")
