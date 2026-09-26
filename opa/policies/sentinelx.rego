package sentinelx.authz

# ==============================================================================
# SENTINELX OPA BASELINE POLICY (PHASE 1 CONTAINER INFRASTRUCTURE)
# ==============================================================================
# This policy provides an initial baseline for OPA container liveness.
# Full 7-factor statutory evaluation rules (BNSS, CrPC, BSA) will be implemented
# in Wave 6 Phase 6 (OPA Integration).

default allow = false

# Container readiness indicator
ready {
    true
}

# Baseline health evaluation rule
health {
    true
}
