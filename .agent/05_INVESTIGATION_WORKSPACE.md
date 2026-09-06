# SentinelX --- Investigation Workspace

## Primary role

The Investigation Workspace is the investigator's continuous operating
desk.

The investigation remains constant while the active lens changes.

## Header

Show: - investigation name - case/FIR ID - status -
access/classification indicator - owner - last updated - voice state -
primary action

## Lenses

**Overview \| Network \| Timeline \| Map \| Evidence \| Entities \|
Findings**

Only the active lens dominates visually.

## Overview

Show: - investigation objective - key entities - open leads - unresolved
contradictions - recent evidence - network summary - recommended next
review

Avoid KPI-card overload.

## Network

Controls: - search - expand - collapse - focus - isolate - shortest
path - common connections - compare - time filter - evidence filter -
relationship filter

Node: **Preview → Open dossier**

Edge: **Relationship Inspector**

## Entity dossier

Sections: - identity - aliases - identifiers - cases - phones -
vehicles - locations - organizations - relationships - timeline -
evidence - similar entities - contradictions

Never infer guilt from association.

## Relationship inspector

``` text
Entity A
   ↓
RELATIONSHIP
   ↓
Entity B
```

Then: - observed count - period - supporting sources - evidence
strength - contradictions - status

## Timeline

Support: - FIR - calls - transactions - locations - vehicle sightings -
surveillance - evidence events

Filters: - entity - case - source - event type - date

## Map

Layers: - incidents - movements - vehicle sightings - locations -
network activity - hotspots

## Evidence

Every evidence item exposes: - source - timestamp - integrity -
classification - related entities - related cases

## Live Proof Engine

``` text
Lead
↓
Entity Match
↓
Temporal Correlation
↓
Graph Connection
↓
Supporting Evidence
↓
Contradicting Evidence
↓
Evidence State
↓
Investigator Decision
```

## Contradictions

Show source A, source B, difference, timestamps, severity and review
status.

Never silently resolve contradictions.

## Core interaction principle

**Click → preview → expand → full view**

Depth increases without destroying context.
