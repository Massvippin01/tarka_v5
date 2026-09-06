# SentinelX --- Product North Star

## The product is an investigator, not a dashboard

The primary unit of interaction is an **investigative question**, not a
chart.

Examples: - Who is connected to this person? - What cases share this
phone? - What changed in this network? - Which records corroborate this
lead? - Which records contradict it? - Where did this vehicle appear? -
Which entities may be duplicates?

## Cognitive model

Every screen must answer: 1. Where am I? 2. What am I looking at? 3. Why
does it matter? 4. What can I do next? 5. How do I return?

## Depth without clutter

Use progressive disclosure:

**Lead → Why → Supporting records → Contradictions → Source**

The application can be extremely deep while exposing only the
information needed at the current decision point.

## One investigation, many lenses

The investigation remains the stable context while the user switches
between: - Graph - Timeline - Map - Evidence - Entities - Cases -
Communications - Transactions - AI findings

## Navigation

Primary areas: - Command Center - Investigations - Cases - Search -
Entities - Network - Timeline - Evidence - Alerts - Watchlists -
Analytics - Reports - Data Sources - System Health - Audit -
Administration - Help

Within an investigation, users should not repeatedly return to the home
page.

## Voice

Voice is a contextual interaction layer. It reduces navigation effort
while the visual interface remains authoritative.

Example: \> "Show connections between these two people."

The UI must visibly update, and the assistant must point to evidence.

## Trust language

Never state guilt from association.

Prefer: \> "Investigative lead: this entity is associated with 4 cases
through corroborated records. Investigator review required."

Use evidence states: - Corroborated - Supported - Partially supported -
Unverified - Contradicted - Insufficient evidence - Requires human
review

## Experience target

New user: **Search → Result → Open → Understand**

Experienced user: **Ctrl+K → Query → Inspect → Verify**

The product should make the investigator think about the investigation,
not the interface.
