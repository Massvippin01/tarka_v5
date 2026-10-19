# SentinelX --- Application Shell & Navigation

## Shell

``` text
┌──────────────────────────────────────────────────────────────┐
│ SentinelX   Global Search / Ctrl+K       Voice   User        │
├───────────┬──────────────────────────────────────────────────┤
│ Primary   │ Breadcrumbs                                     │
│ Navigation│ Page / Investigation context                    │
│           │                                                  │
│           │              ACTIVE WORKSPACE                    │
│           │                                                  │
│           │                    ← Back   Next →               │
└───────────┴──────────────────────────────────────────────────┘
```

## Real routes

Recommended semantic routes:

``` text
/command-center
/investigations
/investigations/:id
/cases
/cases/:id
/search
/entities
/entities/:id
/network
/timeline
/evidence
/evidence/:id
/alerts
/watchlists
/analytics
/reports
/reports/:id
/data-sources
/data-sources/:id
/system-health
/audit
/administration
/help
/profile
```

Every major screen is a real route or functional state.

## Three navigation mechanisms

1.  **Primary navigation** --- jump to major areas.
2.  **Breadcrumbs** --- understand hierarchy.
3.  **Back/Next** --- traverse the actual investigative journey.

Browser history remains authoritative.

## Context preservation

Example:

`Command Center → Investigation A → Person X → Phone X → Relationship → Evidence`

Back should return through that logical chain, not dump the user to the
dashboard.

Preserve where practical: - query - filters - investigation - selected
entity - graph position - timeline range - table pagination

## Command palette

`Ctrl+K`

Actions: - search - open investigation - open entity - navigate -
filter - run safe action - start voice - help

Rank actions by current context.

## Slide-over rule

Use contextual drawers for lightweight inspection:

**Preview → Open full dossier**

Do not turn every click into a full page.

## Navigation quality

No: - fake links - dead buttons - decorative navigation - "coming soon"
core routes - confusing nested dashboards

The user's mental model must remain stable.
