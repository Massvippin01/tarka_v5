from __future__ import annotations

import logging
from collections import defaultdict
from typing import Dict, List, Optional, Set
from app.repositories.unified_store import GraphNode

logger = logging.getLogger("sentinelx.indexer")


class StoreIndexer:
    _instance: Optional[StoreIndexer] = None

    def __init__(self):
        self.type_index: Dict[str, Set[str]] = defaultdict(set)
        self.source_index: Dict[str, Set[str]] = defaultdict(set)
        self.phone_index: Dict[str, Set[str]] = defaultdict(set)
        self.vehicle_index: Dict[str, Set[str]] = defaultdict(set)
        self.account_index: Dict[str, Set[str]] = defaultdict(set)
        self.jurisdiction_index: Dict[str, Set[str]] = defaultdict(set)
        self.case_index: Dict[str, Set[str]] = defaultdict(set)
        self.id_lookup: Dict[str, str] = {}  # Normalized identifier -> canonical_id

    @classmethod
    def get_instance(cls) -> StoreIndexer:
        if cls._instance is None:
            cls._instance = StoreIndexer()
        return cls._instance

    def index_node(self, node: GraphNode):
        nid = node.id
        label = node.label.upper()
        self.type_index[label].add(nid)

        props = node.properties
        source = props.get("source") or props.get("source_system") or "SYNTHETIC_STORE"
        self.source_index[source].add(nid)

        jurisdiction = props.get("jurisdiction") or "Delhi NCR / Gurugram"
        self.jurisdiction_index[jurisdiction].add(nid)

        case_id = props.get("case_id")
        if case_id:
            self.case_index[case_id].add(nid)

        # Index identifier properties
        if label == "PERSON":
            if "phone" in props:
                ph = props["phone"].strip()
                self.phone_index[ph].add(nid)
                self.id_lookup[ph] = nid
            if "name" in props:
                self.id_lookup[props["name"].lower()] = nid
        elif label == "PHONE":
            ph = props.get("number") or props.get("phone_number") or nid
            self.phone_index[ph].add(nid)
            self.id_lookup[ph] = nid
        elif label == "VEHICLE":
            plate = props.get("plate_number") or props.get("registration") or nid
            self.vehicle_index[plate].add(nid)
            self.id_lookup[plate] = nid
        elif label == "ACCOUNT":
            acc = props.get("account_number") or nid
            self.account_index[acc].add(nid)
            self.id_lookup[acc] = nid

    def clear(self):
        self.type_index.clear()
        self.source_index.clear()
        self.phone_index.clear()
        self.vehicle_index.clear()
        self.account_index.clear()
        self.jurisdiction_index.clear()
        self.case_index.clear()
        self.id_lookup.clear()

    def get_nodes_by_type(self, entity_type: str) -> Set[str]:
        return self.type_index.get(entity_type.upper(), set())

    def get_nodes_by_case(self, case_id: str) -> Set[str]:
        return self.case_index.get(case_id, set())

    def lookup_by_identifier(self, identifier: str) -> Optional[str]:
        return self.id_lookup.get(identifier.strip()) or self.id_lookup.get(identifier.strip().lower())
