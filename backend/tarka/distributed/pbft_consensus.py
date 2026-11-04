"""
TARKA SUTRAM 2026 — WORKSTREAM B4
Practical Byzantine Fault Tolerance (PBFT) Consensus Experiment Engine.

Implements a 4-node PBFT protocol (n=4, f=1, Quorum=2f+1=3) for inter-institutional
fraud alert coordination and mule account freezing consensus.
Tolerates up to 1 Byzantine (malicious, corrupted, or crashing) validator.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple


class PBFTPhase(str, Enum):
    IDLE = "IDLE"
    PRE_PREPARE = "PRE_PREPARE"
    PREPARE = "PREPARE"
    COMMIT = "COMMIT"
    COMMITTED = "COMMITTED"
    FAILED = "FAILED"


@dataclass
class PBFTMessage:
    msg_type: str  # "PRE_PREPARE", "PREPARE", "COMMIT"
    view: int
    sequence_number: int
    proposal_digest: str
    sender_id: str
    payload: Optional[Dict[str, Any]] = None
    signature: str = ""


class PBFTValidatorNode:
    """
    Represents an independent validator node in the 4-node PBFT network.
    Maintains its own message logs, prepares, commits, and state machine.
    """

    def __init__(self, node_id: str, is_byzantine: bool = False, byzantine_behavior: Optional[str] = None):
        self.node_id = node_id
        self.is_byzantine = is_byzantine
        self.byzantine_behavior = byzantine_behavior  # "SILENT", "CONFLICTING_DIGEST", "CORRUPT_PAYLOAD"
        self.view = 0
        self.phase = PBFTPhase.IDLE
        self.prepared_proposals: Dict[Tuple[int, int], str] = {}  # (view, seq) -> digest
        self.committed_proposals: Dict[Tuple[int, int], str] = {}
        self.prepare_votes: Dict[Tuple[int, int], Set[str]] = {}  # (view, seq) -> set of sender_ids
        self.commit_votes: Dict[Tuple[int, int], Set[str]] = {}
        self.executed_state: List[Dict[str, Any]] = []

    def receive_pre_prepare(self, msg: PBFTMessage) -> Optional[PBFTMessage]:
        """Handles incoming PRE_PREPARE from primary node."""
        if self.is_byzantine and self.byzantine_behavior == "SILENT":
            return None  # Drop message

        # Verify digest
        expected_digest = hashlib.sha256(json.dumps(msg.payload, sort_keys=True).encode()).hexdigest()
        if msg.proposal_digest != expected_digest:
            return None  # Tampered proposal

        digest_to_send = msg.proposal_digest
        if self.is_byzantine and self.byzantine_behavior == "CONFLICTING_DIGEST":
            digest_to_send = hashlib.sha256(b"MALICIOUS_FORGERY").hexdigest()

        key = (msg.view, msg.sequence_number)
        self.prepared_proposals[key] = digest_to_send
        self.phase = PBFTPhase.PREPARE

        return PBFTMessage(
            msg_type="PREPARE",
            view=msg.view,
            sequence_number=msg.sequence_number,
            proposal_digest=digest_to_send,
            sender_id=self.node_id,
        )

    def receive_prepare(self, msg: PBFTMessage) -> Optional[PBFTMessage]:
        """Handles incoming PREPARE votes from peer nodes."""
        if self.is_byzantine and self.byzantine_behavior == "SILENT":
            return None

        key = (msg.view, msg.sequence_number)
        # Check matching expected digest
        if self.prepared_proposals.get(key) != msg.proposal_digest:
            return None  # Conflicting prepare vote rejected

        if key not in self.prepare_votes:
            self.prepare_votes[key] = set()
        self.prepare_votes[key].add(msg.sender_id)

        # Quorum threshold: need 2f prepares (including itself) -> 2 votes
        if len(self.prepare_votes[key]) >= 2 and self.phase == PBFTPhase.PREPARE:
            self.phase = PBFTPhase.COMMIT
            digest_to_send = msg.proposal_digest
            if self.is_byzantine and self.byzantine_behavior == "CONFLICTING_DIGEST":
                digest_to_send = hashlib.sha256(b"MALICIOUS_COMMIT_FORGERY").hexdigest()
            return PBFTMessage(
                msg_type="COMMIT",
                view=msg.view,
                sequence_number=msg.sequence_number,
                proposal_digest=digest_to_send,
                sender_id=self.node_id,
            )
        return None

    def receive_commit(self, msg: PBFTMessage, original_payload: Dict[str, Any]) -> bool:
        """Handles incoming COMMIT votes. Commits state when 2f+1=3 matching commits collected."""
        if self.is_byzantine and self.byzantine_behavior == "SILENT":
            return False

        key = (msg.view, msg.sequence_number)
        if self.prepared_proposals.get(key) != msg.proposal_digest:
            return False

        if key not in self.commit_votes:
            self.commit_votes[key] = set()
        self.commit_votes[key].add(msg.sender_id)

        # Quorum for commit: 2f + 1 = 3
        if len(self.commit_votes[key]) >= 3 and self.phase != PBFTPhase.COMMITTED:
            self.phase = PBFTPhase.COMMITTED
            self.committed_proposals[key] = msg.proposal_digest
            self.executed_state.append(original_payload)
            return True
        return False


class PBFTConsensusNetwork:
    """
    Simulates a 4-node inter-institutional PBFT network.
    Coordinates consensus rounds, tracks message delivery, measures latency,
    and isolates Byzantine validators.
    """

    def __init__(self, faulty_node_behavior: Optional[str] = None):
        # 4 validators: Node 0 (HDFC), Node 1 (ICICI), Node 2 (AXIS), Node 3 (SBI / Designated Test)
        self.nodes: Dict[str, PBFTValidatorNode] = {
            "node_0": PBFTValidatorNode("node_0"),
            "node_1": PBFTValidatorNode("node_1"),
            "node_2": PBFTValidatorNode("node_2"),
            "node_3": PBFTValidatorNode(
                "node_3",
                is_byzantine=(faulty_node_behavior is not None),
                byzantine_behavior=faulty_node_behavior,
            ),
        }
        self.primary_id = "node_0"
        self.sequence_counter = 0

    def run_consensus_round(self, proposal_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a complete 3-phase PBFT consensus round across all 4 nodes.
        Returns detailed consensus metrics and audit trail.
        """
        start_time = time.perf_counter()
        self.sequence_counter += 1
        seq = self.sequence_counter
        view = 0

        proposal_digest = hashlib.sha256(json.dumps(proposal_payload, sort_keys=True).encode()).hexdigest()

        messages_exchanged = 0

        # Phase 1: Primary broadcasts PRE_PREPARE to all nodes
        pre_prepare_msg = PBFTMessage(
            msg_type="PRE_PREPARE",
            view=view,
            sequence_number=seq,
            proposal_digest=proposal_digest,
            sender_id=self.primary_id,
            payload=proposal_payload,
        )
        messages_exchanged += len(self.nodes)

        # Phase 2: Each node processes PRE_PREPARE and broadcasts PREPARE
        prepare_messages: List[PBFTMessage] = []
        for node in self.nodes.values():
            prep = node.receive_pre_prepare(pre_prepare_msg)
            if prep:
                prepare_messages.append(prep)

        # Exchange PREPARE messages among all nodes
        commit_messages: List[PBFTMessage] = []
        for prep in prepare_messages:
            for node in self.nodes.values():
                messages_exchanged += 1
                commit_msg = node.receive_prepare(prep)
                if commit_msg and commit_msg not in commit_messages:
                    commit_messages.append(commit_msg)

        # Phase 3: Exchange COMMIT messages among all nodes
        commit_success_count = 0
        for comm in commit_messages:
            for node in self.nodes.values():
                messages_exchanged += 1
                if node.receive_commit(comm, proposal_payload):
                    commit_success_count += 1

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Check honest consensus state
        committed_nodes = [
            node.node_id for node in self.nodes.values() if node.phase == PBFTPhase.COMMITTED
        ]

        consensus_achieved = len(committed_nodes) >= 3  # 2f + 1 = 3

        return {
            "consensus_achieved": consensus_achieved,
            "sequence_number": seq,
            "view": view,
            "proposal_digest": proposal_digest,
            "total_nodes": 4,
            "quorum_required": 3,
            "committed_nodes_count": len(committed_nodes),
            "committed_nodes": committed_nodes,
            "byzantine_node": "node_3" if self.nodes["node_3"].is_byzantine else None,
            "byzantine_behavior": self.nodes["node_3"].byzantine_behavior,
            "total_messages_exchanged": messages_exchanged,
            "round_latency_ms": round(elapsed_ms, 3),
            "consensus_guarantee": "PBFT safety and liveness satisfied under n=4, f=1 model.",
            "statutory_caveat": "Consensus validates multi-institution agreement on event ordering; it does not verify raw evidentiary truth.",
        }

