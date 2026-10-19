package sentinelx.authz

# ==============================================================================
# SENTINELX OPA STATUTORY POLICY (WAVE 6 PHASE 6)
# ==============================================================================
# Evaluates:
# 1. Operational Purpose
# 2. Case Scope Authorization
# 3. Operational Jurisdiction
# 4. Clearance Level Hierarchy
# 5. Role Authorization
# 6. Statutory Power Compliance
# 7. Action Risk Class Confirmation

default allow = false
default requires_confirmation = false

# Container readiness and health
ready { true }
health { true }

# Clearance level ranking table
clearance_rank = {
    "UNCLASSIFIED": 0,
    "INTERNAL": 1,
    "CONFIDENTIAL": 2,
    "RESTRICTED": 3,
    "SECRET": 4,
    "TOP_SECRET": 5
}

# Main authorization decision
allow {
    has_valid_purpose
    has_valid_case_scope
    has_valid_jurisdiction
    has_valid_clearance
    has_valid_role
    has_valid_statutory_power
    not_requires_unconfirmed_action
}

# 1. Operational Purpose
has_valid_purpose {
    input.operational_purpose != ""
    count(input.operational_purpose) >= 5
}

# 2. Case Scope
has_valid_case_scope {
    not input.tool_def.case_scope_required
}
has_valid_case_scope {
    input.tool_def.case_scope_required
    input.case_id == input.allowed_cases[_]
}

# 3. Jurisdiction
has_valid_jurisdiction {
    count(input.allowed_jurisdictions) == 0
}
has_valid_jurisdiction {
    count(input.allowed_jurisdictions) > 0
    input.jurisdiction == input.allowed_jurisdictions[_]
}

# 4. Clearance
has_valid_clearance {
    user_rank := clearance_rank[input.officer_clearance]
    req_rank := clearance_rank[input.tool_def.required_clearance]
    user_rank >= req_rank
}

# 5. Role Authorization
has_valid_role {
    input.tool_def.required_role == "*"
}
has_valid_role {
    input.officer_role == input.tool_def.required_role
}
has_valid_role {
    input.officer_role == "SUPERVISOR"
}
has_valid_role {
    input.officer_role == "CASE_ADMINISTRATOR"
}

# 6. Statutory Power
has_valid_statutory_power {
    not input.tool_def.statutory_power_code
}
has_valid_statutory_power {
    input.tool_def.statutory_power_code != ""
    input.statutory_valid == true
}

# 7. Confirmation Requirement for High-Risk Actions
requires_confirmation {
    input.tool_def.risk_class == "EXECUTE"
    not input.has_confirmation_token
}

requires_confirmation {
    input.tool_def.confirmation_required == true
    not input.has_confirmation_token
}

not_requires_unconfirmed_action {
    not requires_confirmation
}

