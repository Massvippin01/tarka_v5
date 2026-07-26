from __future__ import annotations

from app.intelligence.models.timeline import (
    TimelineAnalysis,
    TimelineFinding,
    TimelineSeverity,
)


class TimelineReasoningEngine:

    GAP_THRESHOLD_HOURS = 24

    def analyze(
        self,
        events: list[dict],
    ) -> TimelineAnalysis:

        ordered = sorted(
            events,
            key=lambda event: event["timestamp"],
        )

        findings: list[TimelineFinding] = []

        findings.extend(self._find_impossible_sequences(events))

        findings.extend(self._find_large_time_gaps(ordered))

        findings.extend(self._find_recurring_locations(ordered))

        findings.extend(self._find_recurring_patterns(ordered))

        confidence = max(
            0.0,
            1.0 - (0.1 * len(findings)),
        )

        return TimelineAnalysis(
            findings=tuple(findings),
            overall_confidence=confidence,
            summary=self._build_summary(findings),
        )

    def _find_impossible_sequences(
        self,
        events: list[dict],
    ) -> list[TimelineFinding]:

        findings = []

        for previous, current in zip(events, events[1:]):

            if current["timestamp"] < previous["timestamp"]:

                findings.append(
                    TimelineFinding(
                        category="sequence",
                        description="Impossible chronological sequence detected.",
                        severity=TimelineSeverity.CRITICAL,
                        confidence=0.98,
                    )
                )

        return findings

    def _find_large_time_gaps(
        self,
        events: list[dict],
    ) -> list[TimelineFinding]:

        findings = []

        for previous, current in zip(events, events[1:]):

            gap = (current["timestamp"] - previous["timestamp"]).total_seconds() / 3600

            if gap > self.GAP_THRESHOLD_HOURS:

                findings.append(
                    TimelineFinding(
                        category="gap",
                        description=f"Large timeline gap ({gap:.1f} hours).",
                        severity=TimelineSeverity.MEDIUM,
                        confidence=0.80,
                    )
                )

        return findings

    def _find_recurring_locations(
        self,
        events: list[dict],
    ) -> list[TimelineFinding]:

        findings = []

        counts: dict[str, int] = {}

        for event in events:

            location = event.get("location")

            if location:

                counts[location] = counts.get(location, 0) + 1

        for location, count in counts.items():

            if count >= 2:

                findings.append(
                    TimelineFinding(
                        category="location",
                        description=f"Recurring location detected: {location}",
                        severity=TimelineSeverity.MEDIUM,
                        confidence=0.85,
                    )
                )

        return findings

    def _find_recurring_patterns(
        self,
        events: list[dict],
    ) -> list[TimelineFinding]:

        findings = []

        counts: dict[str, int] = {}

        for event in events:

            pattern = event.get("modus_operandi")

            if pattern:

                counts[pattern] = counts.get(pattern, 0) + 1

        for pattern, count in counts.items():

            if count >= 2:

                findings.append(
                    TimelineFinding(
                        category="modus_operandi",
                        description=f"Recurring modus operandi: {pattern}",
                        severity=TimelineSeverity.HIGH,
                        confidence=0.90,
                    )
                )

        return findings

    @staticmethod
    def _build_summary(
        findings: list[TimelineFinding],
    ) -> str:

        if not findings:

            return "Timeline analysis completed. No anomalies detected."

        return f"Timeline analysis detected " f"{len(findings)} finding(s)."
