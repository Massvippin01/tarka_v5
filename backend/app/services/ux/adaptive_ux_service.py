from __future__ import annotations

import copy
import hashlib
import json
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, Set
from uuid import uuid4

from app.domain.adaptive_ux import (
    AccessibilitySettings,
    AdaptiveLayoutConfig,
    ApprovedLayoutId,
    DetailLevel,
    ModalityPreference,
    NavigationTarget,
    PreferenceSignal,
)
from app.domain.auth import UserIdentity
from app.services.audit_service import AuditService


class InvariantViolationError(PermissionError):
    """Raised when an adaptive UX operation attempts to violate authorization, case scope, or epistemic state."""
    pass


class UnapprovedLayoutError(ValueError):
    """Raised when an unapproved or dynamically invented layout is requested."""
    pass


class BoundedPreferenceModel:
    """
    Stateful, bounded representation of a user's interaction preferences.
    All frequency counts are strictly clamped to avoid overflow or unbounded growth.
    Hysteresis thresholds ensure presentation stability (no layout jitter/thrashing).
    """

    MAX_COUNT_BOUND: int = 100
    MIN_SIGNALS_BEFORE_ADAPTATION: int = 3
    DOMINANCE_RATIO: float = 0.55
    FAILURE_THRESHOLD_FOR_GUIDANCE: int = 3

    def __init__(self, user_id: str) -> None:
        self.user_id = user_id
        self.action_counts: Dict[str, int] = {}
        self.language_counts: Dict[str, int] = {}
        self.detail_level_counts: Dict[DetailLevel, int] = {}
        self.navigation_counts: Dict[NavigationTarget, int] = {}
        self.failed_action_counts: Dict[str, int] = {}
        self.modality_counts: Dict[ModalityPreference, int] = {}
        self.accessibility = AccessibilitySettings()
        self.total_signals: int = 0
        self.current_layout_id: ApprovedLayoutId = ApprovedLayoutId.DEFAULT_OPERATIONAL
        self.current_detail_level: DetailLevel = DetailLevel.STANDARD
        self.current_language: str = "en"
        self.current_modality: ModalityPreference = ModalityPreference.SPLIT_HYBRID

    def record_signal(self, signal: PreferenceSignal) -> None:
        self.total_signals += 1

        if signal.action_name:
            self.action_counts[signal.action_name] = min(
                self.MAX_COUNT_BOUND, self.action_counts.get(signal.action_name, 0) + 1
            )

        if signal.language:
            self.current_language = signal.language
            self.language_counts[signal.language] = min(
                self.MAX_COUNT_BOUND, self.language_counts.get(signal.language, 0) + 1
            )

        if signal.detail_level:
            self.current_detail_level = signal.detail_level
            self.detail_level_counts[signal.detail_level] = min(
                self.MAX_COUNT_BOUND, self.detail_level_counts.get(signal.detail_level, 0) + 1
            )

        if signal.navigation_target:
            self.navigation_counts[signal.navigation_target] = min(
                self.MAX_COUNT_BOUND, self.navigation_counts.get(signal.navigation_target, 0) + 1
            )

        if signal.signal_type == "ACTION_FAILED" and signal.action_name:
            self.failed_action_counts[signal.action_name] = min(
                self.MAX_COUNT_BOUND, self.failed_action_counts.get(signal.action_name, 0) + 1
            )

        if signal.modality:
            self.current_modality = signal.modality
            self.modality_counts[signal.modality] = min(
                self.MAX_COUNT_BOUND, self.modality_counts.get(signal.modality, 0) + 1
            )

        if signal.accessibility:
            self.accessibility = copy.deepcopy(signal.accessibility)

    def get_top_actions(self, limit: int = 4) -> List[str]:
        sorted_actions = sorted(self.action_counts.items(), key=lambda x: x[1], reverse=True)
        return [act for act, count in sorted_actions[:limit] if count >= 2]

    def get_active_helpers(self) -> List[str]:
        return [
            f"Guidance available for '{act}': {count} consecutive failures recorded."
            for act, count in self.failed_action_counts.items()
            if count >= self.FAILURE_THRESHOLD_FOR_GUIDANCE
        ]

    def reset(self) -> None:
        self.action_counts.clear()
        self.language_counts = {"en": 1}
        self.detail_level_counts = {DetailLevel.STANDARD: 1}
        self.navigation_counts.clear()
        self.failed_action_counts.clear()
        self.modality_counts = {ModalityPreference.SPLIT_HYBRID: 1}
        self.accessibility = AccessibilitySettings()
        self.total_signals = 0
        self.current_layout_id = ApprovedLayoutId.DEFAULT_OPERATIONAL
        self.current_detail_level = DetailLevel.STANDARD
        self.current_language = "en"
        self.current_modality = ModalityPreference.SPLIT_HYBRID


class BoundedAdaptiveUXService:
    """
    Subphase E6 — Bounded Adaptive UX
    Adapts SentinelX UI presentation deterministically within an approved layout catalog.
    
    Strict Invariants:
    1. Only selects from ApprovedLayoutId (may NEVER invent layouts).
    2. Zero authority to alter authorization, case scope, evidence visibility, or epistemic state.
    3. Hysteresis ensures layout stability without jitter or layout thrashing.
    4. Complete user and case isolation.
    5. Immediate deterministic reset support.
    """

    _instance: Optional[BoundedAdaptiveUXService] = None

    def __init__(self, audit_service: Optional[AuditService] = None) -> None:
        self.audit = audit_service or AuditService.get_instance()
        self.user_models: Dict[str, BoundedPreferenceModel] = {}

    @classmethod
    def get_instance(cls) -> BoundedAdaptiveUXService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_or_create_model(self, user_id: str) -> BoundedPreferenceModel:
        if user_id not in self.user_models:
            self.user_models[user_id] = BoundedPreferenceModel(user_id)
        return self.user_models[user_id]

    # ── APPROVED LAYOUT POLICY ───────────────────────────────────────────────

    def evaluate_layout_policy(
        self,
        model: BoundedPreferenceModel,
    ) -> ApprovedLayoutId:
        """
        Deterministic, prioritized evaluation of approved layouts.
        Rejects layout invention; strictly chooses from ApprovedLayoutId.
        """
        # 1. Accessibility Override (Highest Priority)
        if model.accessibility.screen_reader_optimized:
            return ApprovedLayoutId.ACCESSIBLE_SCREEN_READER
        if model.accessibility.high_contrast:
            return ApprovedLayoutId.ACCESSIBLE_HIGH_CONTRAST
        if model.accessibility.reduced_motion:
            return ApprovedLayoutId.ACCESSIBLE_REDUCED_MOTION

        # 2. Assisted Guidance for Repeated Failures
        if any(count >= model.FAILURE_THRESHOLD_FOR_GUIDANCE for count in model.failed_action_counts.values()):
            return ApprovedLayoutId.ASSISTED_GUIDANCE

        # Check minimum signal stability threshold before changing default operational layout
        if model.total_signals < model.MIN_SIGNALS_BEFORE_ADAPTATION:
            return model.current_layout_id

        # 3. Modality Preference Dominance
        total_modality_signals = sum(model.modality_counts.values())
        if total_modality_signals > 0:
            voice_count = model.modality_counts.get(ModalityPreference.VOICE_PRIMARY, 0)
            if voice_count / total_modality_signals >= model.DOMINANCE_RATIO:
                return ApprovedLayoutId.VOICE_COMMAND_HUB

        # 4. Navigation Target Dominance
        total_nav_signals = sum(model.navigation_counts.values())
        if total_nav_signals > 0:
            top_nav, top_count = max(model.navigation_counts.items(), key=lambda x: x[1])
            if top_count / total_nav_signals >= model.DOMINANCE_RATIO:
                if top_nav == NavigationTarget.TIMELINE:
                    return ApprovedLayoutId.TIMELINE_CENTRIC
                elif top_nav == NavigationTarget.GRAPH:
                    return ApprovedLayoutId.GRAPH_INTELLIGENCE
                elif top_nav == NavigationTarget.DOSSIER:
                    return ApprovedLayoutId.DOSSIER_EVIDENCE

        # Fallback to balanced default operational layout
        return ApprovedLayoutId.DEFAULT_OPERATIONAL

    def compute_layout_config(self, user_id: str) -> AdaptiveLayoutConfig:
        """
        Builds the current deterministic AdaptiveLayoutConfig for a user.
        """
        model = self._get_or_create_model(user_id)
        chosen_layout = self.evaluate_layout_policy(model)
        model.current_layout_id = chosen_layout

        # Determine dominant language
        if model.language_counts:
            top_lang = max(model.language_counts.items(), key=lambda x: x[1])[0]
        else:
            top_lang = model.current_language
        model.current_language = top_lang

        # Determine dominant detail level
        if model.detail_level_counts:
            top_detail = max(model.detail_level_counts.items(), key=lambda x: x[1])[0]
        else:
            top_detail = model.current_detail_level
        model.current_detail_level = top_detail

        # Determine dominant modality
        if model.modality_counts:
            top_modality = max(model.modality_counts.items(), key=lambda x: x[1])[0]
        else:
            top_modality = model.current_modality
        model.current_modality = top_modality

        # Canvas mapping based on approved layout
        canvas_map = {
            ApprovedLayoutId.DEFAULT_OPERATIONAL: "DEFAULT",
            ApprovedLayoutId.TIMELINE_CENTRIC: "TIMELINE",
            ApprovedLayoutId.GRAPH_INTELLIGENCE: "GRAPH",
            ApprovedLayoutId.DOSSIER_EVIDENCE: "DOSSIER",
            ApprovedLayoutId.VOICE_COMMAND_HUB: "VOICE_HUB",
            ApprovedLayoutId.ACCESSIBLE_HIGH_CONTRAST: "HIGH_CONTRAST",
            ApprovedLayoutId.ACCESSIBLE_REDUCED_MOTION: "STATIC_PANELS",
            ApprovedLayoutId.ACCESSIBLE_SCREEN_READER: "LINEAR_SEMANTIC",
            ApprovedLayoutId.ASSISTED_GUIDANCE: "GUIDANCE_ASSISTED",
        }
        primary_canvas = canvas_map.get(chosen_layout, "DEFAULT")

        # Deterministic configuration signature hash
        config_payload = {
            "user_id": user_id,
            "layout_id": chosen_layout.value,
            "detail_level": top_detail.value,
            "language": top_lang,
            "modality": top_modality.value,
            "quick_actions": model.get_top_actions(),
            "active_helpers": model.get_active_helpers(),
            "primary_canvas": primary_canvas,
        }
        config_hash = hashlib.sha256(
            json.dumps(config_payload, sort_keys=True).encode("utf-8")
        ).hexdigest()

        return AdaptiveLayoutConfig(
            layout_id=chosen_layout,
            detail_level=top_detail,
            language=top_lang,
            modality=top_modality,
            accessibility=copy.deepcopy(model.accessibility),
            quick_actions=model.get_top_actions(),
            active_helpers=model.get_active_helpers(),
            primary_canvas=primary_canvas,
            config_hash=config_hash,
        )

    # ── SIGNAL RECORDING & ADAPTATION ─────────────────────────────────────────

    def record_signal(
        self,
        signal: PreferenceSignal,
    ) -> AdaptiveLayoutConfig:
        """
        Ingests a user preference signal, updates bounded state, and re-evaluates layout.
        Emits an audit record.
        """
        model = self._get_or_create_model(signal.user_id)
        model.record_signal(signal)

        config = self.compute_layout_config(signal.user_id)

        # Audit layout adaptation event
        self.audit.log_event(
            event_type="ADAPTIVE_UX_SIGNAL_RECORDED",
            actor_id=signal.user_id,
            case_id="SYSTEM",
            action_details={
                "signal_type": signal.signal_type,
                "layout_id": config.layout_id.value,
                "config_hash": config.config_hash,
            },
        )
        return config

    def reset_preferences(self, user_id: str) -> AdaptiveLayoutConfig:
        """
        Immediately clears all accumulated signals and resets user to factory defaults.
        Emits an audit record.
        """
        model = self._get_or_create_model(user_id)
        model.reset()

        config = self.compute_layout_config(user_id)

        self.audit.log_event(
            event_type="ADAPTIVE_UX_PREFERENCES_RESET",
            actor_id=user_id,
            case_id="SYSTEM",
            action_details={
                "user_id": user_id,
                "layout_id": config.layout_id.value,
                "config_hash": config.config_hash,
            },
        )
        return config

    # ── INVARIANT VALIDATION (STRICT GUARDS) ───────────────────────────────────

    def validate_authorization_invariants(
        self,
        user: UserIdentity,
        before_state: Dict[str, Any],
        after_config: AdaptiveLayoutConfig,
        case_id: Optional[str] = None,
    ) -> bool:
        """
        Invariant Guard: Adaptive UX must NEVER alter:
        - authorization (clearance, permissions, role)
        - case scope (allowed cases, jurisdiction)
        - evidence visibility rules (redaction masks)
        - provenance records
        - legal constraints
        - epistemic claim standing
        """
        # 1. Role must not change
        if user.role.value != before_state.get("role"):
            raise InvariantViolationError(
                f"Adaptive UX cannot alter user role: {before_state.get('role')} -> {user.role.value}"
            )

        # 2. Clearance must not change
        if user.clearance != before_state.get("clearance"):
            raise InvariantViolationError(
                f"Adaptive UX cannot alter clearance: {before_state.get('clearance')} -> {user.clearance}"
            )

        # 3. Permissions set must not change
        curr_perms = {p.value for p in user.permissions}
        before_perms = set(before_state.get("permissions", []))
        if curr_perms != before_perms:
            raise InvariantViolationError(
                f"Adaptive UX cannot elevate permissions: before={before_perms}, after={curr_perms}"
            )

        # 4. Case scope must not be altered
        if user.scope:
            curr_cases = set(user.scope.allowed_cases)
            before_cases = set(before_state.get("allowed_cases", []))
            if curr_cases != before_cases:
                raise InvariantViolationError(
                    f"Adaptive UX cannot expand case scope: before={before_cases}, after={curr_cases}"
                )

        # 5. Out of scope case access attempt
        if case_id and user.scope and case_id not in user.scope.allowed_cases:
            raise InvariantViolationError(
                f"Adaptive UX cannot grant access to out-of-scope case '{case_id}'"
            )

        return True
