# SentinelX --- Engineering Acceptance Tests

## Definition of done

A screen is complete only when: - route works - refresh works -
interactions work - responsive behavior works - keyboard navigation
works - loading/error states work - permissions are respected - evidence
links resolve - state is preserved where required

## Navigation audit

Test every: - primary navigation item - secondary item - dashboard
card - table row - entity - graph node - relationship - timeline event -
map object - evidence item - alert - watchlist match - report - AI
citation - breadcrumb - back - forward

Expected: **zero dead clicks**.

## Direct route audit

Every route must load directly, survive refresh, respect authentication
and show correct page identity.

## History

Test: `A → B → C → Back → Back → Forward`

Context must remain coherent.

## Responsive

Test: 1280, 1366, 1440, 1920, 2560, ultrawide, tablet, mobile.

## Zoom

Test: 100%, 125%, 150%, 175%, 200%.

## Keyboard

Complete: `Search → Entity → Relationship → Evidence → Back`

without a mouse where practical.

## Voice

Test: - open network - show timeline - go back - search entity - expand
connections - explain relationship - show evidence - show contradictions

UI state and spoken result must remain synchronized.

## Voice safety

Verify: - microphone off by default - explicit activation - confirmation
for consequential actions - clarification for ambiguity - manual
fallback

## AI trust

Every lead exposes: - reason - supporting evidence - contradicting
evidence - confidence - status - source

## Visual QA

At every viewport inspect: - alignment - spacing - typography -
clipping - contrast - focus - panel proportions - graph readability -
table readability - drawer/modal behavior

## Final red-team questions

1.  Can a new investigator use it without training?
2.  Can an experienced investigator move quickly?
3.  Can every AI lead be explained?
4.  Can every important claim reach evidence?
5.  Can users return to previous context?
6.  Does it work at 200%?
7.  Does it look intentional on 4K?
8.  Does voice reduce navigation?
9.  Does the graph help rather than dominate?
10. Does every major click do exactly what is expected?
