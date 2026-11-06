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

    def test_view_change_randomized_exponential_backoff_def_003(self):
        """Verify DEF-003: Randomized exponential backoff with jitter on view change retries."""
        network = PBFTConsensusNetwork()

        # Check backoff calculation increases exponentially with jitter
        b1 = network.calculate_view_change_backoff(1, base_backoff_ms=50.0)
        b2 = network.calculate_view_change_backoff(2, base_backoff_ms=50.0)
        b3 = network.calculate_view_change_backoff(3, base_backoff_ms=50.0)

        assert b1 >= 100.0  # 50 * 2^1 = 100 + jitter
        assert b2 >= 200.0  # 50 * 2^2 = 200 + jitter
        assert b3 >= 400.0  # 50 * 2^3 = 400 + jitter
        assert b3 > b2 > b1

        # Successful view change
        vc_res = network.trigger_view_change(target_view=1)
        assert vc_res["view_change_success"] is True
        assert vc_res["new_view"] == 1
        assert vc_res["new_primary"] == "node_1"
        assert vc_res["quorum_achieved"] is True
        assert "DEF-003" in vc_res["backoff_policy"]

    def test_multi_node_partition_recovery(self):
        """Verify partition isolation prevents false consensus, and healing restores full liveness."""
        network = PBFTConsensusNetwork()

        # Split network into 2 equal halves: {node_0, node_1} and {node_2, node_3}
        # Neither partition has quorum (requires 3 of 4)
        network.partition_network([{"node_0", "node_1"}, {"node_2", "node_3"}])

        proposal = {"directive": "URGENT_FREEZE_PARTITION_TEST", "target": "ACC_SPLIT_01"}
        res_partitioned = network.run_consensus_round(proposal)

        # Quorum cannot be achieved in a 2-2 partition
        assert res_partitioned["consensus_achieved"] is False
        assert res_partitioned["committed_nodes_count"] < 3

        # Heal the network partition
        network.heal_partition()

        # Subsequent consensus round reaches full quorum of 4
        res_healed = network.run_consensus_round(proposal)
        assert res_healed["consensus_achieved"] is True
        assert res_healed["committed_nodes_count"] == 4
        assert res_healed["quorum_required"] == 3
