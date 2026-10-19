from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from app.domain.realtime import EventSubscriptionScope, RealtimeEvent


class RealtimeDispatcher:
    _instance: Optional[RealtimeDispatcher] = None

    def __init__(self):
        self._sequence_counter: int = 0
        self.published_events: List[RealtimeEvent] = []

    @classmethod
    def get_instance(cls) -> RealtimeDispatcher:
        if cls._instance is None:
            cls._instance = RealtimeDispatcher()
        return cls._instance

    def publish_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        case_id: str = "C102",
        jurisdiction: str = "Delhi NCR / Gurugram",
        source: str = "REALTIME_EVENT_FABRIC",
    ) -> RealtimeEvent:
        self._sequence_counter += 1
        event = RealtimeEvent(
            event_type=event_type,
            sequence_number=self._sequence_counter,
            timestamp=datetime.now(UTC).isoformat(),
            source=source,
            case_id=case_id,
            jurisdiction=jurisdiction,
            payload=payload,
        )
        self.published_events.append(event)
        return event

    def format_sse_event(self, event: RealtimeEvent) -> str:
        data_str = json.dumps(event.model_dump())
        return f"id: {event.sequence_number}\nevent: {event.event_type}\ndata: {data_str}\n\n"

    def get_scoped_events(
        self, scope: EventSubscriptionScope, after_sequence: int = 0
    ) -> List[RealtimeEvent]:
        matching = []
        for ev in self.published_events:
            if ev.sequence_number <= after_sequence:
                continue
            if scope.case_id and ev.case_id != scope.case_id:
                continue
            if scope.event_types and ev.event_type not in scope.event_types:
                continue
            matching.append(ev)
        return matching
