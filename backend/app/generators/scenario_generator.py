from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.domain.case import Case
from app.domain.communication import ANPRObservation, CallRecord
from app.domain.enums import ConfidenceLevel, EntityType, RelationshipType, SourceSystem
from app.domain.evidence import Evidence
from app.domain.financial import BankAccount, Transaction, UPIAccount
from app.domain.intelligence import AnalyticalSignal, GoldenScenario
from app.domain.person import Person
from app.domain.phone import Phone
from app.domain.vehicle import Vehicle
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.scenarios")


class ScenarioGenerator:
    def __init__(self, store: UnifiedStore = None):
        self.store = store or UnifiedStore.get_instance()

    @staticmethod
    def generate_golden_vertical_slice() -> GoldenScenario:
        store = UnifiedStore.get_instance()

        # 1. Primary Suspect (Person 1)
        p1 = Person(
            id="P001",
            first_name="Vikram",
            last_name="Singh",
            aliases=["Vicky", "Vicky Don"],
            gender="MALE",
            aadhaar="9988-1122-3344",
            driving_license="DL-1420190012345",
            occupation="Cyber Consultant",
            risk_level="HIGH",
            threat_score=88.5,
            source=SourceSystem.CCTNS.value,
            source_record_id="cctns-p-001",
            evidence_reference="CCTNS Dossier #P-001",
        )
        store.save_person(p1)

        # 2. Co-Accused / Mule Handler (Person 2)
        p2 = Person(
            id="P044",
            first_name="Rahul",
            last_name="Verma",
            aliases=["Chhotu"],
            gender="MALE",
            aadhaar="8877-2233-4455",
            risk_level="MEDIUM",
            threat_score=64.0,
            source=SourceSystem.ICJS.value,
            source_record_id="icjs-p-044",
            evidence_reference="ICJS Record #P-044",
        )
        store.save_person(p2)

        # 3. Case 1 (C102)
        c1 = Case(
            id="C102",
            case_number="FIR-2026-C102",
            fir_number="FIR-2026-C102",
            title="Delhi Cyber Syndicate UPI Fraud",
            description="Multi-victim phish syndicate stealing funds via fake UPI VPAs",
            police_station="Special Cell Cyber North",
            crime_type="Cyber Fraud",
            priority="HIGH",
            investigation_status="OPEN",
            lead_officer="Ins. Rajesh Kumar",
            source=SourceSystem.CCTNS.value,
            source_record_id="fir-c102",
        )
        c1.add_suspect(p1.id)
        store.save_case(c1)

        # 4. Case 2 (C481)
        c2 = Case(
            id="C481",
            case_number="FIR-2026-C481",
            fir_number="FIR-2026-C481",
            title="Gurugram Inter-State Auto Theft & Bank Laundering",
            description="Stolen luxury vehicle syndicate laundering money through mule accounts",
            police_station="Gurugram Cyber Crime PS",
            crime_type="Vehicle Theft & Financial Fraud",
            priority="CRITICAL",
            investigation_status="OPEN",
            lead_officer="ACP Anita Roy",
            source=SourceSystem.CCTNS.value,
            source_record_id="fir-c481",
        )
        c2.add_suspect(p2.id)
        store.save_case(c2)

        # 5. Phones
        ph1 = Phone(
            id="PH001",
            phone_number="+91-9999011223",
            imei="867543029182341",
            carrier="Airtel",
            owner_id=p1.id,
            source=SourceSystem.CDR.value,
        )
        store.save_phone(ph1)

        ph2 = Phone(
            id="PH002",
            phone_number="+91-9888044556",
            imei="867543029182999",
            carrier="Jio",
            owner_id=p2.id,
            source=SourceSystem.CDR.value,
        )
        store.save_phone(ph2)

        # 6. Vehicle (V188)
        v1 = Vehicle(
            id="V188",
            registration_number="DL-01-AB-1888",
            vin="CHASSIS-HY-9921",
            manufacturer="Hyundai",
            model="Creta",
            color="Black",
            owner_id=p1.id,
            source=SourceSystem.VAHAN.value,
        )
        store.save_vehicle(v1)

        # 7. Bank Accounts & UPI
        acc1 = BankAccount(
            id="ACC992",
            account_number="3099882211",
            bank_name="State Bank of India",
            ifsc="SBIN0001234",
            branch_name="Connaught Place Delhi",
            owner_id=p1.id,
            source=SourceSystem.FINANCIAL.value,
        )
        store.save_bank_account(acc1)

        upi1 = UPIAccount(
            id="UPI992",
            vpa="vicky.mule@okicici",
            linked_account_number=acc1.account_number,
            owner_id=p1.id,
            provider="GooglePay",
            source=SourceSystem.NCRP.value,
        )
        store.save_upi_account(upi1)

        acc2 = BankAccount(
            id="ACC481",
            account_number="5010048199",
            bank_name="HDFC Bank",
            ifsc="HDFC0004321",
            branch_name="Cyber City Gurugram",
            owner_id=p2.id,
            source=SourceSystem.FINANCIAL.value,
        )
        store.save_bank_account(acc2)

        # 8. Communication (CDR Call)
        cdr1 = CallRecord(
            id="CDR001",
            caller_number=ph1.phone_number,
            receiver_number=ph2.phone_number,
            duration_seconds=340,
            cell_tower_id="TOWER-DEL-SOUTH-88",
            source=SourceSystem.CDR.value,
            source_record_id="cdr-log-001",
            evidence_reference="Telecom CDR Log #CDR001",
        )
        store.save_call_record(cdr1)

        # 9. Financial Transaction (₹1,25,000)
        txn1 = Transaction(
            id="TXN001",
            txn_id="TXN-2026-9912",
            source_account=acc1.id,
            target_account=acc2.id,
            amount=125000.0,
            reference_number="UPI202688771122",
            flagged=True,
            flag_reason="Cross-bank suspicious mule transfer",
            source=SourceSystem.FINANCIAL.value,
            source_record_id="txn-ref-001",
            evidence_reference="Bank Ledger Txn #UPI202688771122",
        )
        store.save_transaction(txn1)

        # 10. ANPR Vehicle Sighting
        anpr1 = ANPRObservation(
            id="ANPR001",
            plate_number=v1.registration_number,
            camera_id="CAM-DND-04",
            camera_location="DND Toll Flyway Plaza",
            lat=28.57,
            lng=77.29,
            source=SourceSystem.ANPR.value,
            source_record_id="anpr-cam-001",
            evidence_reference="ANPR Toll Cam #CAM-DND-04",
        )
        store.anpr_observations.append(anpr1)

        # 11. Evidence Item (E101)
        ev1 = Evidence(
            id="E101",
            evidence_number="EV-2026-101",
            evidence_type="Digital Extraction",
            description="Forensic phone dump of OnePlus 11 containing encrypted WhatsApp chat logs",
            collected_by="SI Amit Patel",
            storage_location="Vault A, Cyber Lab Delhi",
            chain_of_custody=["Seized by SI Patel", "Logged by Vault Officer", "Analyzed by FSL"],
            case_id=c1.id,
            is_verified=True,
            source=SourceSystem.EFORENSICS.value,
            source_record_id="fsl-report-101",
            evidence_reference="FSL Forensic Report #EV-2026-101",
        )
        ev1.attach_entity(p1.id)
        ev1.attach_entity(ph1.id)
        store.save_evidence(ev1)

        # 12. Case Relationships
        store.register_relationship(p1.id, c1.id, RelationshipType.ACCUSED_IN.value, confidence=1.0, confidence_level=ConfidenceLevel.CONFIRMED.value, evidence_reference="FIR-2026-C102 Name Record", source_system="CCTNS")
        store.register_relationship(p2.id, c2.id, RelationshipType.ACCUSED_IN.value, confidence=1.0, confidence_level=ConfidenceLevel.CONFIRMED.value, evidence_reference="FIR-2026-C481 Charge Sheet", source_system="CCTNS")

        # Hidden Co-Accused Association Relationship
        store.register_relationship(
            p1.id,
            p2.id,
            RelationshipType.CO_ACCUSED_WITH.value,
            confidence=0.89,
            confidence_level=ConfidenceLevel.INFERRED.value,
            evidence_reference="CDR Call Log #CDR001 & Bank Transfer #TXN001",
            source_system="ANALYTICAL_ENGINE",
            analytical_method="MULTI_MODAL_GRAPH_CORRELATION",
            reason="Repeated CDR contact (340s) & ₹1,25,000 money transfer between account ACC992 and ACC481",
        )

        # 13. Analytical Signal
        sig = AnalyticalSignal(
            id="SIG-001",
            signal_type="HIDDEN_CROSS_CASE_LINKAGE",
            title="Cross-Case Connection Detected: Case C102 <-> Case C481",
            description="Case C102 (Delhi Cyber) and Case C481 (Gurugram Fraud) are linked through Person P044, Vehicle V188, Phone PH002, and Transaction TXN001.",
            primary_entity_id="C102",
            secondary_entity_id="C481",
            case_ids=["C102", "C481"],
            confidence=0.89,
            confidence_level=ConfidenceLevel.INFERRED.value,
            supporting_evidence=["EV-2026-101", "CDR001", "TXN001", "ANPR001"],
            path_nodes=["C102", "P001", "PH001", "PH002", "P044", "C481"],
            analytical_method="GRAPH_SHORTEST_PATH_ANALYSIS",
        )
        store.signals.append(sig)

        scenario = GoldenScenario(
            scenario_id="SCENARIO-001",
            family="cross_case_linkage",
            title="Golden Vertical Slice: Cyber Mule Ring & Auto Theft Nexus",
            description="Investigates cross-jurisdiction crime ring connecting Delhi Cyber Fraud (C102) with Gurugram Auto Theft (C481)",
            known_entities=["C102", "C481", "P001", "P044", "PH001", "PH002", "V188", "ACC992", "ACC481"],
            hidden_relationships=[
                {"source": "P001", "target": "P044", "type": "CO_ACCUSED_WITH", "confidence": 0.89}
            ],
            expected_path=["C102", "P001", "PH001", "PH002", "P044", "C481"],
            expected_signals=["HIDDEN_CROSS_CASE_LINKAGE"],
            expected_answer="Case C102 and Case C481 are connected via 4 key links: 1) Communication CDR between Phone PH001 (+91-9999011223) and Phone PH002 (+91-9888044556); 2) Financial transaction of ₹1,25,000 from SBI Account ACC992 to HDFC Account ACC481; 3) Shared location sighting at DND Toll Flyway Plaza (ANPR V188); 4) Primary suspects Vikram Singh (P001) and Rahul Verma (P044) acting as co-conspirators.",
        )
        store.scenarios[scenario.scenario_id] = scenario
        return scenario

    def generate_all_100_scenarios(self) -> List[GoldenScenario]:
        scenarios = []
        # 1. Vertical Slice
        s1 = ScenarioGenerator.generate_golden_vertical_slice()
        scenarios.append(s1)

        families = [
            ("repeat_offender", "Repeat Offender Multi-District Nexus"),
            ("criminal_network", "Inter-State Criminal Gang Network"),
            ("cross_district_network", "Cross-District Extortion Syndicate"),
            ("cross_state_network", "Cross-State Firearms Trafficking"),
            ("cyber_fraud_ring", "Phishing & Banking Cyber Fraud Ring"),
            ("money_mule_network", "Layered Money Mule Account Ring"),
            ("vehicle_linkage", "Stolen Vehicle Cloning Network"),
            ("communication_linkage", "Burner SIM Activation Network"),
            ("location_linkage", "Spatial Overlap Burglary Ring"),
            ("cross_case_identity_resolution", "Multi-Alias Identity Resolution"),
            ("fake_identity_network", "Forged Aadhaar & DL Syndicate"),
            ("financial_network", "Hawala & Crypto Money Laundering"),
            ("missing_person_correlation", "Cross-Border Missing Person Linkage"),
            ("stolen_vehicle_network", "Interstate Car Jacking Network"),
            ("multi_source_timeline_reconstruction", "Multi-Source Homicide Timeline"),
            ("contradictory_evidence", "Contradictory Alibi Evidence Scenario"),
            ("digital_identity_linkage", "Darkweb Handle Identity Mapping"),
            ("emerging_criminal_cluster", "Emerging Ransomware Gang Cluster"),
            ("unknown_entity_discovery", "Unknown Mastermind Entity Discovery"),
            ("complex_multi_hop_network", "10-Hop Transnational Crime Network"),
        ]

        scenario_counter = 2
        for fam, title_prefix in families:
            for idx in range(1, 6):  # 20 families * 5 variants
                if scenario_counter > 100:
                    break
                scen_id = f"SCENARIO-{scenario_counter:03d}"
                c1_id = f"C{100 + scenario_counter}"
                c2_id = f"C{500 + scenario_counter}"
                p1_id = f"P{100 + scenario_counter}"
                p2_id = f"P{200 + scenario_counter}"

                scen = GoldenScenario(
                    scenario_id=scen_id,
                    family=fam,
                    title=f"{title_prefix} - Variant #{idx}",
                    description=f"Synthetic golden investigation testing {fam} pattern in scenario {scen_id}",
                    known_entities=[c1_id, c2_id, p1_id, p2_id],
                    hidden_relationships=[{"source": p1_id, "target": p2_id, "type": "ASSOCIATED_WITH", "confidence": 0.85}],
                    expected_path=[c1_id, p1_id, p2_id, c2_id],
                    expected_signals=[f"{fam.upper()}_SIGNAL"],
                    expected_answer=f"Analytical finding for {scen_id}: Link identified between {c1_id} and {c2_id} via {p1_id} and {p2_id} with confidence 0.85.",
                )
                self.store.scenarios[scen_id] = scen
                scenarios.append(scen)
                scenario_counter += 1

        return scenarios[:100]
