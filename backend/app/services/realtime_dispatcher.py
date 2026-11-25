from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import Any, AsyncGenerator, Dict, List, Optional
from app.domain.realtime import EventSubscriptionScope, RealtimeEvent

logger = logging.getLogger("sentinelx.realtime")


class RealtimeDispatcher:
    _instance: Optional[RealtimeDispatcher] = None

    def __init__(self):
        self._sequence_counter: int = 0
        self.published_events: List[RealtimeEvent] = []
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}

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

        # Broadcast to active async queues
        for cid in [case_id, "*"]:
            queues = self._subscribers.get(cid, [])
            dead = []
            for q in queues:
                try:
                    q.put_nowait(event)
                except Exception:
                    dead.append(q)
            for d in dead:
                if d in queues:
                    queues.remove(d)

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

    async def stream_events(
        self, case_id: str = "C102", after_sequence: int = 0
    ) -> AsyncGenerator[str, None]:
        """
        Durable, real-time SSE generator with Last-Event-ID replay and 15s keepalive heartbeat.
        """
        scope = EventSubscriptionScope(case_id=case_id)

        # 1. Yield initial connection acknowledgment
        init_event = self.publish_event(
            event_type="REALTIME_SUBSCRIPTION_ACTIVE",
            payload={"status": "CONNECTED", "subscribed_case": case_id},
            case_id=case_id,
        )
        yield self.format_sse_event(init_event)

        # 2. Replay past matching events from after_sequence
        for ev in self.get_scoped_events(scope, after_sequence=after_sequence):
            yield self.format_sse_event(ev)

        # 3. Register live async queue
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        if case_id not in self._subscribers:
            self._subscribers[case_id] = []
        self._subscribers[case_id].append(queue)

        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield self.format_sse_event(event)
                except asyncio.TimeoutError:
                    # 15s heartbeat comment to prevent proxy timeouts
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if case_id in self._subscribers and queue in self._subscribers[case_id]:
                self._subscribers[case_id].remove(queue)

