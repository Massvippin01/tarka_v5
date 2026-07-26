from __future__ import annotations

from app.domain.event import Event


class TimelineService:

    @staticmethod
    def chronological(events: list[Event]) -> list[Event]:
        return sorted(
            events,
            key=lambda event: event.occurred_at,
        )

    @staticmethod
    def latest(events: list[Event]) -> Event | None:

        if not events:
            return None

        return max(
            events,
            key=lambda event: event.occurred_at,
        )
