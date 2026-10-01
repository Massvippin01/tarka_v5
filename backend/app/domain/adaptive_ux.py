from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4


class DetailLevel(str, Enum):
    COMPACT = "COMPACT"
    STANDARD = "STANDARD"
    EXPANDED = "EXPANDED"
    FORENSIC_EXHAUSTIVE = "FORENSIC_EXHAUSTIVE"


class ModalityPreference(str, Enum):
    VOICE_PRIMARY = "VOICE_PRIMARY"
    TEXT_PRIMARY = "TEXT_PRIMARY"
    SPLIT_HYBRID = "SPLIT_HYBRID"


class NavigationTarget(str, Enum):
    TIMELINE = "TIMELINE"
    GRAPH = "GRAPH"
    DOSSIER = "DOSSIER"
    EVIDENCE_FABRIC = "EVIDENCE_FABRIC"
    CONTRADICTIONS = "CONTRADICTIONS"


class ApprovedLayoutId(str, Enum):
    """
    Finite, approved layout templates from the design system.
    The adaptive UX may choose ONLY among these approved layouts.
    It may NEVER invent or dynamically generate arbitrary layouts.
    """
    DEFAULT_OPERATIONAL = "DEFAULT_OPERATIONAL"
    TIMELINE_CENTRIC = "TIMELINE_CENTRIC"
    GRAPH_INTELLIGENCE = "GRAPH_INTELLIGENCE"
    DOSSIER_EVIDENCE = "DOSSIER_EVIDENCE"
    VOICE_COMMAND_HUB = "VOICE_COMMAND_HUB"
    ACCESSIBLE_HIGH_CONTRAST = "ACCESSIBLE_HIGH_CONTRAST"
    ACCESSIBLE_REDUCED_MOTION = "ACCESSIBLE_REDUCED_MOTION"
    ACCESSIBLE_SCREEN_READER = "ACCESSIBLE_SCREEN_READER"
    ASSISTED_GUIDANCE = "ASSISTED_GUIDANCE"


@dataclass
class AccessibilitySettings:
    high_contrast: bool = False
    reduced_motion: bool = False
    screen_reader_optimized: bool = False
    font_scale: float = 1.0
    keyboard_navigation_only: bool = False

    def is_active(self) -> bool:
        return (
            self.high_contrast
            or self.reduced_motion
            or self.screen_reader_optimized
            or self.font_scale > 1.0
            or self.keyboard_navigation_only
        )


@dataclass
class PreferenceSignal:
    """
    Structured, bounded signal capturing user interactions.
    """
    signal_id: str
    user_id: str
    signal_type: str  # "ACTION_EXECUTED", "LANGUAGE_SELECTED", "DETAIL_LEVEL_SET", "NAVIGATED", "ACTION_FAILED", "MODALITY_USED", "ACCESSIBILITY_SET"
    timestamp: datetime
    action_name: Optional[str] = None
    language: Optional[str] = None
    detail_level: Optional[DetailLevel] = None
    navigation_target: Optional[NavigationTarget] = None
    modality: Optional[ModalityPreference] = None
    accessibility: Optional[AccessibilitySettings] = None
    failure_reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AdaptiveLayoutConfig:
    """
    Deterministic UI configuration selected from approved layout policies.
    """
    layout_id: ApprovedLayoutId
    detail_level: DetailLevel
    language: str
    modality: ModalityPreference
    accessibility: AccessibilitySettings
    quick_actions: List[str] = field(default_factory=list)
    active_helpers: List[str] = field(default_factory=list)
    primary_canvas: str = "DEFAULT"
    config_hash: str = ""
    generated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "layout_id": self.layout_id.value,
            "detail_level": self.detail_level.value,
            "language": self.language,
            "modality": self.modality.value,
            "accessibility": {
                "high_contrast": self.accessibility.high_contrast,
                "reduced_motion": self.accessibility.reduced_motion,
                "screen_reader_optimized": self.accessibility.screen_reader_optimized,
                "font_scale": self.accessibility.font_scale,
                "keyboard_navigation_only": self.accessibility.keyboard_navigation_only,
            },
            "quick_actions": self.quick_actions,
            "active_helpers": self.active_helpers,
            "primary_canvas": self.primary_canvas,
            "config_hash": self.config_hash,
            "generated_at": self.generated_at.isoformat(),
        }
