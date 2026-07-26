from enum import Enum


class EntityType(str, Enum):
    PERSON = "PERSON"
    CASE = "CASE"
    EVIDENCE = "EVIDENCE"
    EVENT = "EVENT"
    VEHICLE = "VEHICLE"
    PHONE = "PHONE"
    LOCATION = "LOCATION"
    ORGANIZATION = "ORGANIZATION"
    RELATIONSHIP = "RELATIONSHIP"


class EntityStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class LifecycleState(str, Enum):
    CREATED = "CREATED"
    VERIFIED = "VERIFIED"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class SecurityClassification(str, Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"
    SECRET = "SECRET"
