"""
Automated Test Suite for Workstream B4:
Practical Byzantine Fault Tolerance (PBFT) Consensus Experiment.
"""

import pytest
from tarka.distributed.pbft_consensus import PBFTConsensusNetwork, PBFTPhase


class TestWorkstreamB4BFT:
    """Test suite verifying Workstream B4 Byzantine Fault Tolerance."""

    def test_normal_consensus_round_all_nodes_honest(self):
        """Verify that 4 honest validator nodes reach consensus in a standard 3-phase round."""
        network = PBFTConsensusNetwork(faulty_node_behavior=None)

        proposal = {
            "directive": "INTER_BANK_MULE_FREEZE",
            "account_number": "ACC-MULE-SYNDICATE-991",
            "freeze_amount": 145000.0,
            "originator_bank": "HDFC",
        }

        result = network.run_consensus_round(proposal)

        assert result["consensus_achieved"] is True
        assert result["committed_nodes_count"] == 4
        assert result["quorum_required"] == 3
        assert result["round_latency_ms"] > 0
        assert result["total_messages_exchanged"] > 0
        assert "node_0" in result["committed_nodes"]
        assert "node_1" in result["committed_nodes"]
        assert "node_2" in result["committed_nodes"]
        assert "node_3" in result["committed_nodes"]

    def test_consensus_with_one_crashing_or_silent_node(self):
        """Verify that when 1 node is completely silent/crashed, the remaining 3 honest nodes reach quorum."""
        # Node 3 is silent (crashed)
        network = PBFTConsensusNetwork(faulty_node_behavior="SILENT")

        proposal = {
            "directive": "UPI_BLOCK_REQUEST",
            "vpa": "mule_phishing@okaxis",
        }

        result = network.run_consensus_round(proposal)

        assert result["consensus_achieved"] is True
        # Quorum of 3 reached by node_0, node_1, node_2
        assert result["committed_nodes_count"] == 3
        assert "node_3" not in result["committed_nodes"]
        assert result["byzantine_behavior"] == "SILENT"

    def test_consensus_with_one_byzantine_conflicting_node(self):
        """Verify that when 1 node maliciously sends conflicting/forged digests, honest consensus prevails."""
        # Node 3 sends malicious conflicting digests
        network = PBFTConsensusNetwork(faulty_node_behavior="CONFLICTING_DIGEST")

        proposal = {
            "directive": "FRAUD_ATTRIBUTION_SYNC",
            "target_msisdn": "+919876543210",
        }

        result = network.run_consensus_round(proposal)

        assert result["consensus_achieved"] is True
        # Honest nodes 0, 1, 2 reject Node 3's forgery and commit authentic proposal
        assert result["committed_nodes_count"] == 3
        assert "node_3" not in result["committed_nodes"]
        assert set(result["committed_nodes"]) == {"node_0", "node_1", "node_2"}

    def test_multi_round_state_accumulation(self):
        """Verify sequential consensus rounds increment view/sequence numbers properly."""
        network = PBFTConsensusNetwork()

        res1 = network.run_consensus_round({"tx_id": "TX_101"})
        assert res1["sequence_number"] == 1
        assert res1["consensus_achieved"] is True

        res2 = network.run_consensus_round({"tx_id": "TX_102"})
        assert res2["sequence_number"] == 2
        assert res2["consensus_achieved"] is True

