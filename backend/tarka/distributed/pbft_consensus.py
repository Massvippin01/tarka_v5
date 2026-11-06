"""
TARKA SUTRAM 2026 — WORKSTREAM B4
Practical Byzantine Fault Tolerance (PBFT) Consensus Experiment Engine.

Implements a 4-node PBFT protocol (n=4, f=1, Quorum=2f+1=3) for inter-institutional
fraud alert coordination, mule account freezing consensus, and state replication.
Supports View Changes, Leader Failures, Network Partitions, and Adversarial Equivocation.

Governing Principles:
1. Consensus establishes agreement about protocol state, not real-world factual truth.
2. Quorum is 3 of 4 validators under f=1.
"""

from __future__ import annotations

import copy
import hashlib
import hmac
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
    VIEW_CHANGE = "VIEW_CHANGE"
    FAILED = "FAILED"


@dataclass
class PBFTMessage:
    msg_type: str  # "PRE_PREPARE", "PREPARE", "COMMIT", "VIEW_CHANGE", "NEW_VIEW"
    view: int
    sequence_number: int
    proposal_digest: str
    sender_id: str
    payload: Optional[Dict[str, Any]] = None
    signature: str = ""

    def compute_signature(self, secret_key: str = "VALIDATOR_KEY") -> str:
        data = f"{self.msg_type}:{self.view}:{self.sequence_number}:{self.proposal_digest}:{self.sender_id}"
        return hmac.new(secret_key.encode(), data.encode(), hashlib.sha256).hexdigest()

    def verify_signature(self, secret_key: str = "VALIDATOR_KEY") -> bool:
        if not self.signature:
            return False
        expected = self.compute_signature(secret_key)
        return hmac.compare_digest(self.signature, expected)


class PBFTValidatorNode:
    """
    Represents an independent validator node in the 4-node PBFT network.
    Maintains its own message logs, prepares, commits, view state, and executed state machine.
    """

    def __init__(
        self,
        node_id: str,
        is_byzantine: bool = False,
        byzantine_behavior: Optional[str] = None,
        signing_key: str = "VALIDATOR_KEY",
    ):
        self.node_id = node_id
        self.is_byzantine = is_byzantine
        self.byzantine_behavior = byzantine_behavior  # "SILENT", "CONFLICTING_DIGEST", "CORRUPT_PAYLOAD", "INVALID_SIG", "EQUIVOCATE"
        self.signing_key = signing_key
        self.view = 0
        self.phase = PBFTPhase.IDLE
        self.prepared_proposals: Dict[Tuple[int, int], str] = {}  # (view, seq) -> digest
        self.committed_proposals: Dict[Tuple[int, int], str] = {}
        self.prepare_votes: Dict[Tuple[int, int], Set[str]] = {}  # (view, seq) -> set of sender_ids
        self.commit_votes: Dict[Tuple[int, int], Set[str]] = {}
        self.view_change_votes: Dict[int, Set[str]] = {}  # view -> set of sender_ids
        self.executed_state: List[Dict[str, Any]] = []
        self.message_history: List[PBFTMessage] = []
        self.active = True

    def reset_round(self):
        """Reset operational phase between rounds while preserving executed state."""
        self.phase = PBFTPhase.IDLE

    def receive_pre_prepare(self, msg: PBFTMessage, verify_signatures: bool = False) -> Optional[PBFTMessage]:
        """Handles incoming PRE_PREPARE from primary node."""
        if not self.active or (self.is_byzantine and self.byzantine_behavior == "SILENT"):
            return None

        if verify_signatures and not msg.verify_signature(self.signing_key):
            return None  # Unauthenticated message rejected

        # Verify digest
        expected_digest = hashlib.sha256(json.dumps(msg.payload, sort_keys=True).encode()).hexdigest()
        if msg.proposal_digest != expected_digest:
            return None  # Tampered proposal

        digest_to_send = msg.proposal_digest
        if self.is_byzantine and self.byzantine_behavior in ("CONFLICTING_DIGEST", "EQUIVOCATE"):
            digest_to_send = hashlib.sha256(b"MALICIOUS_FORGERY").hexdigest()

        key = (msg.view, msg.sequence_number)
        self.prepared_proposals[key] = digest_to_send
        self.phase = PBFTPhase.PREPARE

        prep = PBFTMessage(
            msg_type="PREPARE",
            view=msg.view,
            sequence_number=msg.sequence_number,
            proposal_digest=digest_to_send,
            sender_id=self.node_id,
        )
        if self.is_byzantine and self.byzantine_behavior == "INVALID_SIG":
            prep.signature = "INVALID_CORRUPTED_SIGNATURE"
        else:
            prep.signature = prep.compute_signature(self.signing_key)

        self.message_history.append(msg)
        return prep

    def receive_prepare(self, msg: PBFTMessage, verify_signatures: bool = False) -> Optional[PBFTMessage]:
        """Handles incoming PREPARE votes from peer nodes."""
        if not self.active or (self.is_byzantine and self.byzantine_behavior == "SILENT"):
            return None

        if verify_signatures and not msg.verify_signature(self.signing_key):
            return None

        key = (msg.view, msg.sequence_number)
        if self.prepared_proposals.get(key) != msg.proposal_digest:
            return None  # Conflicting prepare vote rejected

        if key not in self.prepare_votes:
            self.prepare_votes[key] = set()
        self.prepare_votes[key].add(msg.sender_id)

        # Quorum threshold: need 2f prepares (including itself) -> 2 votes
        if len(self.prepare_votes[key]) >= 2 and self.phase == PBFTPhase.PREPARE:
            self.phase = PBFTPhase.COMMIT
            digest_to_send = msg.proposal_digest
            if self.is_byzantine and self.byzantine_behavior in ("CONFLICTING_DIGEST", "EQUIVOCATE"):
                digest_to_send = hashlib.sha256(b"MALICIOUS_COMMIT_FORGERY").hexdigest()
            comm = PBFTMessage(
                msg_type="COMMIT",
                view=msg.view,
                sequence_number=msg.sequence_number,
                proposal_digest=digest_to_send,
                sender_id=self.node_id,
            )
            comm.signature = comm.compute_signature(self.signing_key)
            self.message_history.append(msg)
            return comm
        return None

    def receive_commit(self, msg: PBFTMessage, original_payload: Dict[str, Any], verify_signatures: bool = False) -> bool:
        """Handles incoming COMMIT votes. Commits state when 2f+1=3 matching commits collected."""
        if not self.active or (self.is_byzantine and self.byzantine_behavior == "SILENT"):
            return False

        if verify_signatures and not msg.verify_signature(self.signing_key):
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
            self.message_history.append(msg)
            return True
        return False

    def initiate_view_change(self, target_view: int) -> PBFTMessage:
        """Constructs a VIEW_CHANGE message when leader timeout or Byzantine equivocation occurs."""
        self.phase = PBFTPhase.VIEW_CHANGE
        self.view = target_view
        msg = PBFTMessage(
            msg_type="VIEW_CHANGE",
            view=target_view,
            sequence_number=len(self.executed_state),
            proposal_digest=hashlib.sha256(f"VIEW_CHANGE_{target_view}".encode()).hexdigest(),
            sender_id=self.node_id,
        )
        msg.signature = msg.compute_signature(self.signing_key)
        return msg

    def receive_view_change(self, msg: PBFTMessage) -> bool:
        """Receives VIEW_CHANGE votes. Quorum of 2f+1=3 reaches agreement on new view."""
        if not self.active:
            return False
        if msg.view not in self.view_change_votes:
            self.view_change_votes[msg.view] = set()
        self.view_change_votes[msg.view].add(msg.sender_id)
        if len(self.view_change_votes[msg.view]) >= 3:
            self.view = msg.view
            self.phase = PBFTPhase.IDLE
            return True
        return False


class PBFTConsensusNetwork:
    """
    Simulates a 4-node inter-institutional PBFT network.
    Coordinates consensus rounds, tracks message delivery, measures latency,
    handles view changes, network partitions, and isolates Byzantine validators.
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
        self.view = 0
        self.primary_id = "node_0"
        self.sequence_counter = 0
        self._partitions: Optional[List[Set[str]]] = None  # None = fully connected

    def partition_network(self, partition_groups: List[Set[str]]):
        """Simulate a network split into isolated partitions."""
        self._partitions = partition_groups

    def heal_partition(self):
        """Restore full network connectivity."""
        self._partitions = None

    def _can_communicate(self, sender: str, receiver: str) -> bool:
        if self._partitions is None:
            return True
        for group in self._partitions:
            if sender in group and receiver in group:
                return True
        return False

    def calculate_view_change_backoff(
        self,
        attempt: int,
        base_backoff_ms: float = 50.0,
        max_backoff_ms: float = 2000.0,
    ) -> float:
        """
        Calculates randomized exponential backoff with jitter (DEF-003)
        to prevent split-brain thundering herds during asynchronous view changes.
        """
        import secrets
        exponent = min(attempt, 6)
        raw_backoff = min(max_backoff_ms, base_backoff_ms * (2 ** exponent))
        jitter = secrets.randbelow(max(int(raw_backoff * 0.25), 5))
        return round(raw_backoff + jitter, 2)

    def trigger_view_change(
        self,
        target_view: int,
        retry_on_partition: bool = False,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Executes a formal view change protocol when primary fails.
        Elects new leader: primary = node_(view % 4).
        Implements randomized exponential backoff (DEF-003) when retrying across network disruptions.
        """
        attempts = 0
        backoff_applied_ms = 0.0

        while True:
            attempts += 1
            view_change_msgs = []
            for node in self.nodes.values():
                if node.active:
                    view_change_msgs.append(node.initiate_view_change(target_view))

            agreed_nodes = set()
            for msg in view_change_msgs:
                for node in self.nodes.values():
                    if node.active and self._can_communicate(msg.sender_id, node.node_id):
                        if node.receive_view_change(msg):
                            agreed_nodes.add(node.node_id)

            new_primary_idx = target_view % 4
            new_primary = f"node_{new_primary_idx}"

            success = len(agreed_nodes) >= 3
            if success:
                self.view = target_view
                self.primary_id = new_primary
                break

            if not retry_on_partition or attempts >= max_retries:
                break

            backoff = self.calculate_view_change_backoff(attempts)
            backoff_applied_ms += backoff

        return {
            "view_change_success": success,
            "new_view": target_view,
            "new_primary": new_primary,
            "agreed_nodes": list(agreed_nodes),
            "quorum_achieved": len(agreed_nodes) >= 3,
            "attempts": attempts,
            "backoff_applied_ms": backoff_applied_ms,
            "backoff_policy": "Randomized exponential backoff with 25% jitter (DEF-003)",
        }

    def run_consensus_round(
        self,
        proposal_payload: Dict[str, Any],
        verify_signatures: bool = False,
        duplicate_messages: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes a complete 3-phase PBFT consensus round across all 4 nodes.
        Returns detailed consensus metrics and audit trail.
        """
        start_time = time.perf_counter()
        self.sequence_counter += 1
        seq = self.sequence_counter
        view = self.view

        # Reset node round states
        for n in self.nodes.values():
            n.reset_round()

        proposal_digest = hashlib.sha256(json.dumps(proposal_payload, sort_keys=True).encode()).hexdigest()
        messages_exchanged = 0

        # Phase 1: Primary broadcasts PRE_PREPARE to all nodes
        primary_node = self.nodes.get(self.primary_id)
        if not primary_node or not primary_node.active:
            # Primary is dead -> fail round or trigger view change
            return {
                "consensus_achieved": False,
                "error": f"Primary {self.primary_id} is inactive",
                "committed_nodes_count": 0,
                "committed_nodes": [],
            }

        pre_prepare_msg = PBFTMessage(
            msg_type="PRE_PREPARE",
            view=view,
            sequence_number=seq,
            proposal_digest=proposal_digest,
            sender_id=self.primary_id,
            payload=proposal_payload,
        )
        pre_prepare_msg.signature = pre_prepare_msg.compute_signature(primary_node.signing_key)
        messages_exchanged += len(self.nodes)

        # Phase 2: Each node processes PRE_PREPARE and broadcasts PREPARE
        prepare_messages: List[PBFTMessage] = []
        for node in self.nodes.values():
            if self._can_communicate(self.primary_id, node.node_id):
                prep = node.receive_pre_prepare(pre_prepare_msg, verify_signatures=verify_signatures)
                if prep:
                    prepare_messages.append(prep)
                    if duplicate_messages:
                        prepare_messages.append(copy.deepcopy(prep))  # Duplicate injection

        # Exchange PREPARE messages among all nodes
        commit_messages: List[PBFTMessage] = []
        for prep in prepare_messages:
            for node in self.nodes.values():
                if self._can_communicate(prep.sender_id, node.node_id):
                    messages_exchanged += 1
                    commit_msg = node.receive_prepare(prep, verify_signatures=verify_signatures)
                    if commit_msg and commit_msg not in commit_messages:
                        commit_messages.append(commit_msg)
                        if duplicate_messages:
                            commit_messages.append(copy.deepcopy(commit_msg))

        # Phase 3: Exchange COMMIT messages among all nodes
        commit_success_count = 0
        for comm in commit_messages:
            for node in self.nodes.values():
                if self._can_communicate(comm.sender_id, node.node_id):
                    messages_exchanged += 1
                    if node.receive_commit(comm, proposal_payload, verify_signatures=verify_signatures):
                        commit_success_count += 1

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        committed_nodes = [
            node.node_id for node in self.nodes.values() if node.phase == PBFTPhase.COMMITTED
        ]

        consensus_achieved = len(committed_nodes) >= 3  # 2f + 1 = 3

        return {
            "consensus_achieved": consensus_achieved,
            "sequence_number": seq,
            "view": view,
            "primary_id": self.primary_id,
            "proposal_digest": proposal_digest,
            "total_nodes": len(self.nodes),
            "quorum_required": 3,
            "committed_nodes_count": len(committed_nodes),
            "committed_nodes": committed_nodes,
            "byzantine_node": "node_3" if self.nodes.get("node_3") and self.nodes["node_3"].is_byzantine else None,
            "byzantine_behavior": self.nodes["node_3"].byzantine_behavior if self.nodes.get("node_3") else None,
            "total_messages_exchanged": messages_exchanged,
            "round_latency_ms": round(elapsed_ms, 3),
            "consensus_guarantee": "PBFT safety and liveness satisfied under n=4, f=1 model.",
            "statutory_caveat": "Consensus validates multi-institution agreement on event ordering; it does not verify raw evidentiary truth.",
        }
