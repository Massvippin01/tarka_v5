

--- PAGE 1 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
TARKA
 
THREE-MEMBER
 
TEAM
 
EXECUTION
 
CHECKLIST
 
SUTRAM
 
2026
  
|
  
Problem
 
Statement
 
04
 
HOW
 
TO
 
USE
 
THIS
 
CHECKLIST
 
☐
  
☐
 
Not
 
started
   
◐
 
In
 
progress
   
☑
 
Completed
 
and
 
independently
 
verified
 
☐
  
Mark
 
an
 
item
 
complete
 
only
 
when
 
implementation
 
works,
 
tests
 
pass,
 
assumptions
 
are
 
documented
 
and
 
another
 
member
 
can
 
verify
 
it.
 
☐
  
Each
 
member
 
owns
 
the
 
assigned
 
workstream
 
end-to-end.
 
Shared
 
contracts
 
and
 
integration
 
are
 
joint
 
responsibilities.
 
☐
  
This
 
checklist
 
is
 
a
 
target
 
specification,
 
not
 
a
 
claim
 
that
 
every
 
capability
 
is
 
already
 
implemented
 
or
 
authorised
 
for
 
production.
 
1.
 
TEAM-WIDE
 
FOUNDATION
 
(ALL
 
THREE
 
MEMBERS)
 
☐
  
Confirm
 
the
 
three
 
named
 
owners
 
and
 
record
 
ownership
 
in
 
OWNERS.md.
 
☐
  
Create
 
one
 
shared
 
Git
 
repository
 
and
 
protect
 
the
 
main
 
branch.
 
☐
  
Create
 
the
 
agreed
 
monorepo
 
directory
 
structure.
 
☐
  
Agree
 
the
 
system
 
architecture,
 
service
 
boundaries
 
and
 
deployment
 
model.
 
☐
  
Freeze
 
v1
 
schemas
 
for
 
Case,
 
Evidence,
 
Entity,
 
Relationship,
 
Transaction,
 
Claim
 
and
 
Institution
 
Event.
 
☐
  
Create
 
one
 
canonical
 
synthetic
 
case
 
with
 
stable
 
IDs
 
and
 
documented
 
ground
 
truth.
 
☐
  
Create
 
mock
 
APIs
 
for
 
all
 
three
 
workstreams
 
so
 
development
 
can
 
proceed
 
independently.
 
☐
  
Agree
 
API
 
versioning,
 
error
 
formats,
 
timestamps,
 
identifier
 
formats
 
and
 
pagination
 
conventions.
 
☐
  
Create
 
a
 
shared
 
environment
 
setup
 
guide
 
and
 
one-command
 
local
 
startup.
 
☐
  
Create
 
a
 
shared
 
issue
 
board
 
with
 
owner,
 
acceptance
 
criteria,
 
dependencies
 
and
 
status.
 
☐
  
Maintain
 
architecture
 
decision
 
records
 
for
 
cross-cutting
 
technical
 
decisions.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 2 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Document
 
pre-existing
 
TARKA
 
work
 
separately
 
from
 
new
 
SUTRAM
 
contributions.
 
☐
  
Maintain
 
third-party
 
dependency,
 
licence,
 
dataset
 
and
 
AI-tool
 
disclosure
 
records.
 
2.
 
MEMBER
 
A:
 
FORENSIC
 
INTELLIGENCE
 
AND
 
FORMAL
 
REASONING
 
Ownership:
 
investigative
 
analytics,
 
temporal
 
knowledge
 
graph,
 
transaction
 
reconstruction,
 
Forensic
 
Claim
 
Compiler,
 
formal
 
verification
 
and
 
replay.
 
2.1
 
Entity
 
resolution
 
☐
  
Define
 
canonical
 
entity
 
types
 
for
 
persons,
 
bank
 
accounts,
 
UPI
 
IDs,
 
phone
 
numbers,
 
devices,
 
IP
 
addresses
 
and
 
merchants.
 
☐
  
Implement
 
identifier
 
normalisation
 
for
 
supported
 
input
 
formats.
 
☐
  
Generate
 
candidate
 
entity
 
matches
 
with
 
explainable
 
matching
 
factors.
 
☐
  
Detect
 
duplicate,
 
conflicting
 
and
 
incomplete
 
identity
 
attributes.
 
☐
  
Support
 
investigator
 
accept,
 
reject
 
and
 
merge
 
decisions.
 
☐
  
Track
 
entity
 
provenance,
 
historical
 
identifiers
 
and
 
match
 
uncertainty.
 
☐
  
Represent
 
shared-device
 
and
 
shared-network
 
ambiguity
 
without
 
asserting
 
common
 
ownership.
 
☐
  
Expose
 
stable
 
entity
 
IDs
 
and
 
documented
 
APIs
 
to
 
the
 
graph
 
and
 
UI.
 
2.2
 
Temporal
 
relationship
 
and
 
fraud-network
 
intelligence
 
☐
  
Implement
 
an
 
evidence-backed
 
temporal
 
knowledge
 
graph.
 
☐
  
Represent
 
nodes
 
and
 
edges
 
with
 
stable
 
IDs
 
and
 
source
 
evidence
 
references.
 
☐
  
Support
 
direct
 
and
 
multi-hop
 
relationship
 
discovery.
 
☐
  
Identify
 
candidate
 
mule-account
 
networks
 
and
 
suspicious
 
clusters.
 
☐
  
Correlate
 
financial,
 
device,
 
telecom
 
and
 
communication
 
observations
 
where
 
authorised
 
data
 
exists.
 
☐
  
Support
 
cross-case
 
and
 
cross-complaint
 
correlation
 
using
 
synthetic
 
fixtures.
 
☐
  
Implement
 
graph
 
filters
 
and
 
justified
 
community
 
or
 
motif
 
analysis.
 
☐
  
Display
 
valid-time
 
intervals,
 
uncertainty,
 
provenance
 
and
 
contradictory
 
evidence.
 
☐
  
Clearly
 
distinguish
 
observed
 
relationships
 
from
 
inferred
 
hypotheses.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 3 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
2.3
 
Transaction
 
intelligence
 
☐
  
Reconstruct
 
transaction
 
sequences
 
and
 
multi-hop
 
fund
 
flows.
 
☐
  
Detect
 
split
 
transfers,
 
consolidation
 
and
 
candidate
 
layering
 
patterns.
 
☐
  
Handle
 
reversals,
 
refunds,
 
duplicate
 
records
 
and
 
missing
 
transactions.
 
☐
  
Reconcile
 
account
 
balances
 
and
 
identify
 
discrepancies.
 
☐
  
Implement
 
tainted-fund
 
analysis
 
with
 
explicit
 
accounting
 
assumptions.
 
☐
  
Calculate
 
potentially
 
recoverable
 
balances
 
without
 
presenting
 
projections
 
as
 
actual
 
recovery.
 
☐
  
Maintain
 
transaction-level
 
links
 
to
 
original
 
evidence.
 
☐
  
Test
 
the
 
engine
 
against
 
independently
 
specified
 
synthetic
 
transaction
 
ground
 
truth.
 
2.4
 
Telecom
 
and
 
temporal
 
reasoning
 
☐
  
Correlate
 
authorised
 
SIM-swap
 
observations,
 
CDR
 
records
 
and
 
device
 
identifiers.
 
☐
  
Analyse
 
IMEI,
 
IP
 
and
 
network
 
relationships
 
only
 
when
 
supporting
 
records
 
exist.
 
☐
  
Handle
 
CGNAT
 
and
 
shared-network
 
ambiguity;
 
do
 
not
 
attribute
 
a
 
person
 
from
 
an
 
IP
 
alone.
 
☐
  
Reconstruct
 
event
 
timelines
 
across
 
multiple
 
sources.
 
☐
  
Preserve
 
original
 
timestamps
 
and
 
normalise
 
to
 
a
 
documented
 
time
 
standard.
 
☐
  
Model
 
timezone
 
differences,
 
clock
 
drift
 
and
 
timestamp
 
uncertainty.
 
☐
  
Detect
 
temporal
 
contradictions
 
and
 
identify
 
affected
 
claims.
 
2.5
 
Forensic
 
Claim
 
Compiler
 
☐
  
Define
 
typed
 
evidence
 
and
 
investigative-claim
 
schemas.
 
☐
  
Create
 
a
 
canonical
 
evidence
 
intermediate
 
representation.
 
☐
  
Represent
 
claims,
 
observations,
 
assumptions,
 
dependencies,
 
contradictions
 
and
 
limitations.
 
☐
  
Build
 
a
 
claim
 
dependency
 
graph.
 
☐
  
Implement
 
declarative
 
investigative
 
rules
 
using
 
Datalog
 
or
 
an
 
equivalent
 
approach
 
where
 
justified.
 
☐
  
Compile
 
selected
 
claims
 
into
 
machine-checkable
 
constraints.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 4 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Implement
 
explicit
 
claim
 
states:
 
supported,
 
contradicted,
 
uncertain,
 
unsupported
 
and
 
not
 
evaluated.
 
☐
  
Link
 
every
 
material
 
claim
 
to
 
source
 
evidence
 
and
 
transformation
 
history.
 
☐
  
Version
 
claims
 
and
 
preserve
 
investigator
 
review
 
decisions.
 
☐
  
Prevent
 
failed
 
integrity
 
preconditions
 
from
 
silently
 
supporting
 
dependent
 
claims.
 
☐
  
Generate
 
machine-readable
 
claim
 
manifests
 
and
 
investigator-readable
 
explanations.
 
2.6
 
Formal
 
verification
 
and
 
counterexamples
 
☐
  
Define
 
financial
 
accounting
 
invariants.
 
☐
  
Define
 
temporal
 
consistency
 
constraints.
 
☐
  
Define
 
identity
 
and
 
evidence-integrity
 
preconditions.
 
☐
  
Use
 
Z3/SMT
 
for
 
explicitly
 
encoded
 
constraints
 
where
 
appropriate.
 
☐
  
Generate
 
useful
 
counterexamples
 
when
 
a
 
constraint
 
fails.
 
☐
  
Test
 
critical
 
investigation
 
state
 
transitions
 
and
 
preconditions.
 
☐
  
Add
 
property-based
 
tests
 
for
 
invariants.
 
☐
  
Document
 
the
 
assumptions
 
and
 
scope
 
of
 
every
 
verification
 
result.
 
☐
  
Never
 
claim
 
that
 
solver
 
consistency
 
proves
 
real-world
 
truth
 
or
 
criminal
 
guilt.
 
2.7
 
Investigation
 
replay
 
and
 
counterfactuals
 
☐
  
Record
 
evidence
 
references,
 
parser/rule
 
versions
 
and
 
analysis
 
configurations.
 
☐
  
Track
 
claim
 
dependencies
 
and
 
execution
 
history.
 
☐
  
Allow
 
controlled
 
evidence
 
exclusion
 
and
 
simulated
 
record
 
changes.
 
☐
  
Recompute
 
all
 
dependent
 
findings
 
after
 
an
 
evidence
 
change.
 
☐
  
Identify
 
exactly
 
which
 
claims
 
changed
 
and
 
why.
 
☐
  
Preserve
 
prior
 
investigation
 
versions
 
and
 
reviewer
 
decisions.
 
☐
  
Generate
 
a
 
replayable
 
investigation
 
package.
 
☐
  
Independently
 
reproduce
 
deterministic
 
outputs.
 
2.8
 
Member
 
A
 
interface
 
and
 
completion
 
gate
 
☐
  
Build
 
entity
 
detail
 
and
 
alias-resolution
 
views.
 
☐
  
Build
 
fraud-network
 
graph
 
and
 
relationship
 
provenance
 
views.
 
☐
  
Build
 
transaction-flow
 
and
 
reconciliation
 
views.
 
☐
  
Build
 
claim
 
inspector
 
with
 
support,
 
contradiction
 
and
 
limitation
 
panels.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 5 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Build
 
formal-check
 
and
 
counterexample
 
views.
 
☐
  
Build
 
replay
 
comparison
 
showing
 
before-and-after
 
findings.
 
☐
  
Demonstrate
 
one
 
complete
 
case
 
from
 
resolved
 
entities
 
to
 
replayable
 
claims.
 
☐
  
Obtain
 
independent
 
review
 
from
 
Member
 
B
 
and
 
Member
 
C.
 
3.
 
MEMBER
 
B:
 
PRIVACY,
 
CRYPTOGRAPHY
 
AND
 
DISTRIBUTED
 
SYSTEMS
 
Ownership:
 
institutional
 
boundaries,
 
PSI,
 
zero-knowledge
 
proof
 
prototype,
 
evidence-event
 
synchronisation,
 
BFT
 
experiment
 
and
 
protocol
 
threat
 
model.
 
3.1
 
Simulated
 
institutional
 
environment
 
☐
  
Create
 
three
 
simulated
 
institutions
 
with
 
separate
 
datasets
 
and
 
access
 
boundaries.
 
☐
  
Define
 
institution
 
identities,
 
roles,
 
keys
 
and
 
permitted
 
operations
 
for
 
the
 
prototype.
 
☐
  
Define
 
authorised
 
query
 
and
 
disclosure
 
workflows.
 
☐
  
Ensure
 
one
 
institution
 
cannot
 
retrieve
 
another
 
institution's
 
complete
 
source
 
dataset
 
through
 
the
 
prototype
 
API.
 
☐
  
Use
 
synthetic
 
records
 
only
 
unless
 
explicit
 
data
 
permissions
 
exist.
 
☐
  
Document
 
the
 
trust
 
assumptions
 
and
 
adversary
 
model.
 
3.2
 
Private
 
Set
 
Intersection
 
(PSI)
 
☐
  
Define
 
the
 
identifiers
 
to
 
be
 
matched
 
and
 
their
 
normalisation
 
rules.
 
☐
  
Select
 
an
 
established
 
PSI
 
protocol/library
 
rather
 
than
 
inventing
 
a
 
cryptographic
 
protocol.
 
☐
  
Implement
 
a
 
PSI
 
request
 
and
 
response
 
flow
 
across
 
simulated
 
institutions.
 
☐
  
Return
 
only
 
the
 
permitted
 
intersection
 
result.
 
☐
  
Test
 
false
 
matches,
 
missed
 
matches,
 
malformed
 
inputs
 
and
 
duplicate
 
identifiers.
 
☐
  
Document
 
protocol
 
leakage,
 
metadata
 
exposure
 
and
 
adversary
 
assumptions.
 
☐
  
Log
 
query
 
authorisation,
 
participating
 
institutions
 
and
 
permitted
 
disclosures.
 
☐
  
Do
 
not
 
treat
 
ordinary
 
hashing
 
of
 
low-entropy
 
identifiers
 
as
 
sufficient
 
privacy
 
protection.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 6 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
3.3
 
Zero-knowledge
 
proof
 
prototype
 
☐
  
Select
 
an
 
established
 
zero-knowledge
 
proving
 
framework.
 
☐
  
Define
 
one
 
narrow
 
and
 
mathematically
 
precise
 
statement
 
to
 
prove.
 
☐
  
Specify
 
public
 
inputs,
 
private
 
witness
 
inputs
 
and
 
circuit
 
constraints.
 
☐
  
Select
 
an
 
appropriate
 
commitment
 
construction
 
for
 
the
 
selected
 
use
 
case.
 
☐
  
Generate
 
a
 
proof
 
from
 
synthetic
 
data.
 
☐
  
Verify
 
the
 
proof
 
independently
 
in
 
a
 
separate
 
verifier
 
process
 
or
 
module.
 
☐
  
Test
 
altered
 
public
 
inputs,
 
malformed
 
witnesses
 
and
 
invalid
 
proofs.
 
☐
  
Measure
 
proving
 
time,
 
verification
 
time
 
and
 
proof
 
size.
 
☐
  
Document
 
trusted
 
setup
 
assumptions,
 
if
 
applicable.
 
☐
  
State
 
clearly
 
that
 
the
 
proof
 
validates
 
the
 
encoded
 
computation,
 
not
 
the
 
truth
 
of
 
source
 
records.
 
3.4
 
Distributed
 
event
 
model
 
and
 
synchronisation
 
☐
  
Define
 
a
 
multi-institution
 
event
 
envelope
 
and
 
stable
 
event
 
identity.
 
☐
  
Include
 
issuer,
 
event
 
type,
 
schema
 
version,
 
sequence/version
 
and
 
timestamps.
 
☐
  
Include
 
payload
 
commitment
 
and
 
idempotency
 
key
 
where
 
appropriate.
 
☐
  
Implement
 
append-only
 
event
 
history
 
for
 
the
 
prototype.
 
☐
  
Handle
 
duplicate
 
submissions
 
idempotently.
 
☐
  
Handle
 
delayed
 
and
 
out-of-order
 
submissions.
 
☐
  
Define
 
explicit
 
conflict
 
states
 
and
 
deterministic
 
reconciliation
 
rules.
 
☐
  
Preserve
 
received
 
time
 
separately
 
from
 
source
 
event
 
time.
 
☐
  
Investigate
 
vector
 
clocks
 
or
 
equivalent
 
causality
 
metadata.
 
☐
  
Test
 
clock
 
skew
 
without
 
assuming
 
wall-clock
 
order
 
proves
 
causal
 
order.
 
3.5
 
Byzantine
 
Fault
 
Tolerance
 
(BFT)
 
experiment
 
☐
  
Define
 
the
 
exact
 
coordination
 
problem
 
that
 
requires
 
consensus.
 
☐
  
Document
 
the
 
validator
 
trust
 
model
 
and
 
Byzantine
 
fault
 
assumptions.
 
☐
  
Build
 
an
 
isolated
 
four-validator
 
prototype.
 
☐
  
Implement
 
or
 
integrate
 
a
 
vetted
 
PBFT-style
 
protocol
 
for
 
the
 
experiment.
 
☐
  
Demonstrate
 
normal
 
proposal,
 
prepare
 
and
 
commit
 
behaviour.
 
☐
  
Introduce
 
one
 
faulty
 
validator
 
and
 
demonstrate
 
the
 
documented
 
tolerance
 
case.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 7 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Test
 
delayed,
 
duplicated
 
and
 
conflicting
 
event
 
submissions.
 
☐
  
Measure
 
consensus
 
latency
 
and
 
throughput
 
under
 
the
 
tested
 
conditions.
 
☐
  
Record
 
failure
 
cases
 
and
 
conditions
 
where
 
consensus
 
cannot
 
progress.
 
☐
  
Do
 
not
 
use
 
BFT
 
as
 
proof
 
that
 
submitted
 
evidence
 
is
 
truthful.
 
☐
  
Do
 
not
 
introduce
 
consensus
 
into
 
every
 
internal
 
service
 
without
 
a
 
demonstrated
 
need.
 
3.6
 
Privacy
 
and
 
security
 
engineering
 
☐
  
Create
 
a
 
privacy
 
threat
 
model
 
for
 
cross-institution
 
correlation.
 
☐
  
Document
 
participant
 
trust
 
assumptions
 
and
 
collusion
 
scenarios.
 
☐
  
Document
 
key
 
generation,
 
storage,
 
rotation
 
and
 
access
 
boundaries
 
for
 
the
 
prototype.
 
☐
  
Identify
 
metadata
 
leakage
 
and
 
query-pattern
 
exposure.
 
☐
  
Define
 
audit
 
records
 
for
 
privacy
 
queries
 
and
 
disclosures.
 
☐
  
Test
 
unauthorised
 
query
 
attempts
 
and
 
institution
 
boundary
 
violations.
 
☐
  
Document
 
limitations
 
of
 
PSI,
 
ZK
 
proofs
 
and
 
consensus
 
separately.
 
3.7
 
Member
 
B
 
interface
 
and
 
completion
 
gate
 
☐
  
Build
 
institution
 
status
 
and
 
connection
 
views.
 
☐
  
Build
 
PSI
 
request,
 
authorisation
 
and
 
result
 
views.
 
☐
  
Build
 
proof
 
generation
 
and
 
independent
 
verification
 
views.
 
☐
  
Build
 
event
 
synchronisation
 
and
 
validator
 
status
 
views.
 
☐
  
Show
 
faulty-node
 
experiment
 
results
 
and
 
protocol
 
assumptions.
 
☐
  
Demonstrate
 
three-institution
 
PSI,
 
one
 
independently
 
verified
 
proof
 
and
 
the
 
four-validator
 
BFT
 
experiment.
 
☐
  
Obtain
 
independent
 
review
 
from
 
Member
 
A
 
and
 
Member
 
C.
 
4.
 
MEMBER
 
C:
 
EVIDENCE
 
PLATFORM,
 
AI
 
AND
 
EVALUATION
 
Ownership:
 
evidence
 
intake
 
and
 
preservation,
 
case/workflow
 
platform,
 
bounded
 
AI
 
assistance,
 
synthetic
 
data,
 
adversarial
 
testing,
 
evaluation,
 
report
 
assembly,
 
application
 
shell
 
and
 
deployment.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 8 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
4.1
 
Case
 
and
 
platform
 
foundation
 
☐
  
Implement
 
case
 
creation,
 
stable
 
case
 
IDs
 
and
 
case
 
status
 
management.
 
☐
  
Implement
 
users,
 
roles
 
and
 
case-level
 
access
 
boundaries.
 
☐
  
Implement
 
assignments,
 
review
 
decisions
 
and
 
investigation
 
workflow
 
states.
 
☐
  
Implement
 
versioned
 
APIs
 
and
 
database
 
migrations.
 
☐
  
Create
 
structured
 
application
 
logging
 
and
 
audit
 
events.
 
☐
  
Provide
 
mock
 
endpoints
 
and
 
typed
 
API
 
clients
 
for
 
Members
 
A
 
and
 
B.
 
4.2
 
Evidence
 
ingestion
 
and
 
preservation
 
☐
  
Implement
 
CSV
 
ingestion.
 
☐
  
Implement
 
XLSX
 
ingestion.
 
☐
  
Implement
 
JSON
 
ingestion.
 
☐
  
Implement
 
PDF
 
ingestion
 
for
 
supported
 
document
 
types.
 
☐
  
Add
 
image/OCR
 
processing
 
only
 
where
 
accuracy
 
can
 
be
 
validated.
 
☐
  
Create
 
adapters
 
for
 
synthetic
 
bank,
 
UPI,
 
complaint,
 
message,
 
CDR
 
and
 
device
 
records.
 
☐
  
Validate
 
schemas
 
and
 
flag
 
malformed,
 
duplicate
 
and
 
incomplete
 
records.
 
☐
  
Preserve
 
original
 
evidence
 
objects
 
without
 
modifying
 
source
 
bytes.
 
☐
  
Calculate
 
and
 
verify
 
SHA-256
 
integrity
 
digests.
 
☐
  
Record
 
source,
 
acquisition
 
time,
 
original
 
event
 
time
 
and
 
parser
 
version.
 
☐
  
Record
 
transformation
 
history
 
and
 
evidence
 
lineage.
 
☐
  
Support
 
controlled
 
batch
 
ingestion
 
and
 
a
 
demonstrable
 
streaming
 
path
 
if
 
time
 
permits.
 
☐
  
Demonstrate
 
offline
 
evidence
 
processing
 
where
 
required.
 
4.3
 
AI
 
assistance
 
☐
  
Implement
 
complaint
 
text
 
extraction
 
and
 
structured
 
entity
 
extraction.
 
☐
  
Implement
 
OCR
 
assistance
 
with
 
validation
 
and
 
confidence/quality
 
indicators.
 
☐
  
Implement
 
scam-message
 
classification
 
for
 
supported
 
fraud
 
typologies.
 
☐
  
Provide
 
evidence-grounded
 
retrieval
 
and
 
summarisation.
 
☐
  
Provide
 
bounded
 
investigative
 
question
 
suggestions.
 
☐
  
Provide
 
report
 
drafting
 
based
 
only
 
on
 
referenced
 
case
 
material.
 
☐
  
Record
 
model
 
identity,
 
version,
 
task,
 
inputs,
 
outputs
 
and
 
timestamp.
 
☐
  
Test
 
prompt
 
injection
 
and
 
tool
 
misuse.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 9 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Require
 
human
 
review
 
for
 
consequential
 
outputs.
 
☐
  
Prevent
 
AI
 
from
 
modifying
 
original
 
evidence,
 
authoritatively
 
calculating
 
balances
 
or
 
determining
 
guilt.
 
4.4
 
Synthetic
 
data
 
and
 
ground
 
truth
 
☐
  
Build
 
a
 
synthetic
 
financial
 
fraud-network
 
generator.
 
☐
  
Create
 
independently
 
specified
 
ground
 
truth,
 
not
 
labels
 
copied
 
from
 
the
 
detector's
 
own
 
rules.
 
☐
  
Generate
 
mule-account
 
rotation
 
and
 
multi-hop
 
transfers.
 
☐
  
Generate
 
split
 
transfers,
 
consolidation,
 
reversals
 
and
 
delayed
 
transfers.
 
☐
  
Generate
 
legitimate
 
merchant
 
activity
 
and
 
benign
 
shared-device/IP
 
scenarios.
 
☐
  
Generate
 
cross-institution
 
transaction
 
cases.
 
☐
  
Generate
 
SIM-swap
 
and
 
timeline
 
scenarios
 
using
 
synthetic
 
observations.
 
☐
  
Version
 
datasets,
 
scenarios,
 
random
 
seeds
 
and
 
ground-truth
 
definitions.
 
☐
  
Maintain
 
held-out
 
cases
 
that
 
are
 
not
 
used
 
to
 
tune
 
detection
 
rules.
 
4.5
 
Adversarial
 
testing
 
and
 
benchmarking
 
☐
  
Inject
 
missing
 
records.
 
☐
  
Inject
 
duplicated
 
records.
 
☐
  
Inject
 
reordered
 
and
 
delayed
 
records.
 
☐
  
Inject
 
conflicting
 
identity
 
attributes.
 
☐
  
Inject
 
clock
 
drift
 
and
 
inconsistent
 
timestamps.
 
☐
  
Inject
 
evidence-corruption
 
scenarios.
 
☐
  
Simulate
 
faulty
 
institutional
 
event
 
submissions
 
for
 
Member
 
B's
 
tests.
 
☐
  
Measure
 
entity-resolution
 
precision
 
and
 
recall.
 
☐
  
Measure
 
relationship
 
and
 
network
 
reconstruction
 
quality.
 
☐
  
Measure
 
transaction
 
reconciliation
 
correctness.
 
☐
  
Measure
 
false-positive
 
burden
 
and
 
analyse
 
false
 
negatives.
 
☐
  
Measure
 
evidence
 
coverage
 
and
 
claim-verification
 
correctness.
 
☐
  
Measure
 
robustness
 
under
 
adversarial
 
changes
 
and
 
distribution
 
shift.
 
☐
  
Measure
 
latency,
 
memory
 
use
 
and
 
scalability.
 
☐
  
Publish
 
reproducible
 
experiment
 
configurations
 
and
 
failure
 
analysis.
 
4.6
 
Reporting
 
and
 
product
 
interface
 
☐
  
Implement
 
the
 
global
 
application
 
shell,
 
navigation
 
and
 
role-aware
 
routing.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 10 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Integrate
 
Member
 
A's
 
forensic
 
analysis
 
screens.
 
☐
  
Integrate
 
Member
 
B's
 
privacy
 
and
 
protocol
 
screens.
 
☐
  
Implement
 
case
 
overview
 
and
 
evidence
 
intake
 
workspaces.
 
☐
  
Implement
 
benchmark
 
and
 
system-health
 
views.
 
☐
  
Assemble
 
evidence
 
index,
 
provenance
 
manifest,
 
claim
 
register
 
and
 
limitations
 
register.
 
☐
  
Display
 
simulated,
 
incomplete,
 
inferred,
 
AI-generated
 
and
 
human-reviewed
 
states
 
distinctly.
 
☐
  
Ensure
 
reports
 
are
 
evidence-linked
 
and
 
reproducible.
 
☐
  
Label
 
reports
 
as
 
investigative
 
drafts
 
requiring
 
human
 
review,
 
not
 
automatic
 
legal
 
certification.
 
4.7
 
Deployment
 
and
 
completion
 
gate
 
☐
  
Create
 
Docker-based
 
local
 
deployment.
 
☐
  
Provide
 
documented
 
environment
 
variables
 
and
 
safe
 
example
 
configuration.
 
☐
  
Ensure
 
secrets
 
are
 
excluded
 
from
 
Git.
 
☐
  
Provide
 
database
 
migrations
 
and
 
synthetic
 
seed
 
scripts.
 
☐
  
Add
 
CI
 
for
 
formatting,
 
linting,
 
unit
 
tests,
 
contract
 
tests
 
and
 
build
 
checks.
 
☐
  
Provide
 
backup
 
and
 
restore
 
instructions
 
for
 
prototype
 
data.
 
☐
  
Verify
 
a
 
clean
 
clone
 
can
 
start
 
the
 
complete
 
application.
 
☐
  
Demonstrate
 
the
 
full
 
end-to-end
 
case
 
with
 
Members
 
A
 
and
 
B.
 
☐
  
Obtain
 
independent
 
review
 
from
 
Member
 
A
 
and
 
Member
 
B.
 
5.
 
SHARED
 
CONTRACTS
 
AND
 
INTEGRATION
 
CHECKLIST
 
☐
  
Freeze
 
Case
 
schema
 
v1
 
and
 
publish
 
example
 
payloads.
 
☐
  
Freeze
 
Evidence
 
schema
 
v1
 
and
 
publish
 
example
 
payloads.
 
☐
  
Freeze
 
Entity
 
and
 
Relationship
 
schemas
 
v1.
 
☐
  
Freeze
 
Transaction
 
schema
 
v1.
 
☐
  
Freeze
 
Claim
 
schema
 
v1.
 
☐
  
Freeze
 
Institution
 
Event
 
schema
 
v1.
 
☐
  
Freeze
 
PSI
 
request/result
 
and
 
ZK
 
proof
 
metadata
 
schemas.
 
☐
  
Freeze
 
AI
 
annotation
 
and
 
benchmark
 
result
 
schemas.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 11 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Define
 
common
 
error
 
responses
 
and
 
validation
 
states.
 
☐
  
Define
 
timestamp
 
semantics
 
and
 
preserve
 
source
 
timestamps.
 
☐
  
Define
 
stable
 
ID
 
generation
 
and
 
uniqueness
 
rules.
 
☐
  
Create
 
contract
 
tests
 
for
 
every
 
shared
 
API.
 
☐
  
Create
 
mocks
 
so
 
all
 
three
 
members
 
can
 
test
 
independently.
 
☐
  
Run
 
integration
 
tests
 
on
 
the
 
same
 
canonical
 
synthetic
 
case.
 
☐
  
Review
 
every
 
breaking
 
contract
 
change
 
with
 
all
 
affected
 
owners.
 
6.
 
SINGLE-REPOSITORY
 
AND
 
GIT
 
GOVERNANCE
 
☐
  
Protect
 
main
 
and
 
require
 
pull
 
requests.
 
☐
  
Use
 
owner-prefixed
 
feature
 
branches,
 
for
 
example
 
feat/a-claim-compiler,
 
feat/b-psi
 
and
 
feat/c-ingestion.
 
☐
  
Keep
 
pull
 
requests
 
focused
 
on
 
one
 
feature
 
or
 
coherent
 
change.
 
☐
  
Require
 
tests
 
and
 
documentation
 
with
 
each
 
pull
 
request.
 
☐
  
Use
 
the
 
review
 
rotation:
 
A
 
reviews
 
B,
 
B
 
reviews
 
C,
 
C
 
reviews
 
A.
 
☐
  
Require
 
all
 
three
 
to
 
review
 
shared
 
contract
 
or
 
architecture
 
changes.
 
☐
  
Keep
 
ownership
 
directories
 
separate;
 
do
 
not
 
edit
 
another
 
member's
 
internals
 
without
 
coordination.
 
☐
  
Pin
 
dependencies
 
and
 
check
 
licences
 
before
 
adding
 
them.
 
☐
  
Never
 
commit
 
credentials,
 
private
 
keys,
 
real
 
customer
 
data
 
or
 
local
 
environment
 
files.
 
☐
  
Do
 
not
 
reset,
 
clean,
 
force-push,
 
overwrite
 
or
 
delete
 
shared
 
data/volumes
 
without
 
explicit
 
approval
 
and
 
verified
 
backup.
 
☐
  
Resolve
 
merge
 
conflicts
 
with
 
the
 
affected
 
owner
 
rather
 
than
 
silently
 
replacing
 
their
 
implementation.
 
7.
 
INTEGRATION
 
MILESTONES
 
Milestone
 
Member
 
A
 
Member
 
B
 
Member
 
C
 
Exit
 
condition
 
M0:
 
Contracts
 
Approve
 
forensic
 
schemas
 
Approve
 
protocol/event
 
schemas
 
Create
 
repo,
 
contracts,
 
mocks
 
and
 
CI
 
All
 
three
 
can
 
run
 
mocks
 
and
 
pass
 
contract
 
tests.
 
M1:
 
First
 
vertical
 
slice
 
Resolve
 
entities
 
and
 
Run
 
basic
 
institution
 
event
 
Ingest
 
evidence,
 
hash
 
Three
 
independent
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 12 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
reconstruct
 
a
 
small
 
transaction
 
graph
 
flow
 
and
 
PSI
 
happy
 
path
 
it
 
and
 
create
 
a
 
case
 
slices
 
run
 
locally.
 
M2:
 
Core
 
capability
 
Claim
 
Compiler
 
v1
 
and
 
meaningful
 
Z3
 
constraints
 
PSI
 
workflow,
 
ZK
 
proof
 
and
 
event
 
synchronisation
 
AI
 
annotation,
 
report
 
assembly
 
and
 
app
 
integration
 
One
 
case
 
flows
 
across
 
all
 
three
 
workstreams.
 
M3:
 
Adversarial
 
validation
 
Contradictions,
 
counterexampl
es
 
and
 
evidence
 
removal
 
Faulty
 
validator,
 
duplicates,
 
delays
 
and
 
invalid
 
proof
 
Held-out
 
generator,
 
benchmark
 
metrics
 
and
 
clean
 
deployment
 
Failures
 
are
 
detected,
 
measured
 
and
 
explained.
 
M4:
 
Demo
 
freeze
 
Stable
 
graph,
 
flow,
 
claim
 
and
 
replay
 
demo
 
Stable
 
PSI,
 
proof
 
verification
 
and
 
BFT
 
demo
 
Stable
 
integrated
 
app,
 
reports
 
and
 
install
 
guide
 
Clean-machine
 
rehearsal
 
passes.
 
 
8.
 
FINAL
 
TEAM
 
ACCEPTANCE
 
GATES
 
☐
  
One
 
clean
 
clone
 
can
 
be
 
installed
 
and
 
started
 
using
 
the
 
documented
 
instructions.
 
☐
  
One
 
canonical
 
synthetic
 
case
 
passes
 
through
 
evidence
 
ingestion
 
and
 
integrity
 
verification.
 
☐
  
Entities
 
are
 
resolved
 
with
 
explainable
 
matching
 
and
 
explicit
 
ambiguity.
 
☐
  
Financial
 
flows
 
are
 
reconstructed
 
and
 
reconciled.
 
☐
  
Claims
 
show
 
supporting
 
evidence,
 
contradictory
 
evidence,
 
assumptions
 
and
 
limitations.
 
☐
  
Formal
 
checks
 
produce
 
useful
 
counterexamples
 
for
 
deliberately
 
invalid
 
scenarios.
 
☐
  
Removing
 
or
 
changing
 
evidence
 
recomputes
 
dependent
 
findings.
 
☐
  
Three
 
simulated
 
institutions
 
demonstrate
 
the
 
selected
 
PSI
 
workflow.
 
☐
  
One
 
narrow
 
ZK
 
proof
 
is
 
generated
 
and
 
independently
 
verified.
 
☐
  
Four
 
validators
 
demonstrate
 
the
 
documented
 
BFT
 
fault-tolerance
 
experiment.
 
☐
  
Adversarial
 
and
 
held-out
 
benchmark
 
results
 
are
 
reproducible.
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 

--- PAGE 13 ---

TARKA
  
|
  
SUTRAM
 
2026
  
|
  
PS04
 
☐
  
Reports
 
contain
 
evidence
 
references,
 
provenance,
 
limitations
 
and
 
human-review
 
status.
 
☐
  
All
 
screens
 
distinguish
 
observation,
 
inference,
 
AI
 
suggestion,
 
simulation
 
and
 
human
 
approval.
 
☐
  
All
 
three
 
members
 
can
 
explain
 
the
 
complete
 
architecture
 
and
 
demonstrate
 
their
 
own
 
subsystem.
 
☐
  
All
 
three
 
members
 
can
 
answer
 
technical
 
questions
 
about
 
the
 
other
 
two
 
workstreams.
 
9.
 
NON-NEGOTIABLE
 
ENGINEERING
 
BOUNDARIES
 
☐
  
Do
 
not
 
add
 
BFT,
 
blockchain,
 
agents
 
or
 
cryptography
 
merely
 
as
 
technology
 
labels.
 
☐
  
Do
 
not
 
claim
 
consensus
 
proves
 
source
 
evidence
 
is
 
truthful.
 
☐
  
Do
 
not
 
claim
 
PSI
 
or
 
ordinary
 
hashing
 
eliminates
 
privacy
 
risk.
 
☐
  
Do
 
not
 
claim
 
a
 
ZK
 
proof
 
proves
 
the
 
underlying
 
real-world
 
event
 
occurred.
 
☐
  
Do
 
not
 
infer
 
common
 
ownership
 
from
 
shared
 
IP,
 
device
 
or
 
network
 
observations
 
alone.
 
☐
  
Do
 
not
 
claim
 
causal
 
attribution
 
from
 
correlation.
 
☐
  
Do
 
not
 
allow
 
an
 
LLM
 
to
 
modify
 
original
 
evidence
 
or
 
authoritatively
 
determine
 
guilt.
 
☐
  
Do
 
not
 
invent
 
performance,
 
accuracy
 
or
 
recovery
 
figures.
 
☐
  
Do
 
not
 
present
 
synthetic
 
benchmark
 
results
 
as
 
real-world
 
accuracy.
 
☐
  
Do
 
not
 
claim
 
reports
 
are
 
automatically
 
court-admissible
 
or
 
legally
 
certified.
 
☐
  
Do
 
not
 
integrate
 
with
 
real
 
bank,
 
telecom
 
or
 
government
 
systems
 
without
 
authorisation.
 
                             
FINAL
 
DEFINITION
 
OF
 
SUCCESS
 
THREE
 
INDEPENDENTLY
 
OWNED
 
WORKSTREAMS
  
+
  
ONE
 
SHARED
 
CONTRACT
 
SYSTEM
  
+
  
CONTINUOUS
 
INTEGRATION
  
+
  
REPRODUCIBLE
 
END-TO-END
 
DEMONSTRATION
 
THREE-MEMBER
 
OWNERSHIP
 
CHECKLIST
  
•
  
SINGLE
 
REPOSITORY
 