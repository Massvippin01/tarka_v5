# SentinelX --- Voice Investigation Assistant

## Concept

Voice is a first-class contextual interaction layer. It behaves like a
skilled investigation aide, not a mascot and not a separate chatbot
page.

It can: - navigate - search - filter - expand graph relationships -
summarize findings - locate evidence - surface unresolved
contradictions - ask clarifying questions

It cannot autonomously make consequential investigative decisions.

## Assistant identity

Working name: **Sentinel**

Use a small, restrained voice presence in the header. No giant avatar or
animated AI orb.

## Listening

Primary: **Push-to-talk**

Optional: **Explicit investigation session**

Never silently listen by default.

## State machine

``` text
OFF
↓
ACTIVATED
↓
LISTENING
↓
TRANSCRIBING
↓
UNDERSTANDING
↓
EXECUTING
↓
VERIFYING
↓
RESPONDING
↓
OFF
```

State must be visible.

## Human-like response style

Prefer: \> "I found three cases sharing that number. I opened the
strongest match. Want me to compare the timelines?"

Avoid: \> "Query executed successfully."

The voice should be concise; long reasoning remains visual.

## Context-aware references

If the user says: \> "Show his vehicles."

Resolve "his" only when the active context is unambiguous.

Otherwise: \> "Do you mean Person X or Person Y?"

Never guess in a high-impact context.

## Navigation commands

Examples: - "Open the network." - "Show the timeline." - "Go back." -
"Focus on this phone." - "Find the connections."

## Investigation commands

Examples: - "Show connections between these two people." - "What
evidence supports this?" - "What contradicts this?" - "Find similar
cases." - "Compare this network with six months ago."

## Proactive assistance

Permitted: \> "There are two unresolved contradictions in this
investigation."

> "I found three corroborated records connecting these entities."

Never proactively declare guilt.

## Visual synchronization

Every meaningful spoken claim has a visual anchor.

Example: Voice: "Two corroborated records support this relationship."

UI: **2 Supporting Records**

## Confirmation policy

No confirmation for reversible actions such as search, filter, open,
expand or go back.

Confirmation required for: - export - delete - permission changes -
sensitive sharing - high-impact watchlist changes - final report
submission

## Privacy

Inactive: **Microphone: OFF**

Active: **Listening**

Processing: **Processing voice**

Provide an immediate stop control.

Do not retain raw audio unless explicitly authorized/configured.

## Multilingual

Architecture must support multilingual STT/TTS through adapters. Initial
priority can be English and Kannada, consistent with the supplied
research direction. fileciteturn40file4L258-L266

## Voice architecture

``` text
Microphone
↓
VAD
↓
Streaming STT
↓
Intent + Entity Parsing
↓
Authorization
↓
Tool Execution
↓
Evidence Verification
↓
UI Update
↓
Streaming TTS
```

Use provider adapters so voice infrastructure can evolve independently.

## Personality

Concise, calm, proactive when useful, operationally focused, never
theatrical.
