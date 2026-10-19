from __future__ import annotations

import logging
import random
from typing import Any, Dict, List, Optional
from app.domain.case import Case
from app.domain.evidence import Evidence
from app.domain.financial import BankAccount
from app.domain.person import Person
from app.domain.phone import Phone
from app.domain.enums import ConfidenceLevel, RelationshipType
from app.domain.vehicle import Vehicle
from app.generators.scenario_generator import ScenarioGenerator
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.generator")


class DeterministicDatasetGenerator:
    def __init__(self, seed: int = 12345):
        self.seed = seed
        self.store = UnifiedStore.get_instance()

    def generate_tier_dataset(self, tier: str = "TIER_A") -> Dict[str, Any]:
        random.seed(self.seed)

        # Scale target entity counts
        tier_counts = {
            "TIER_A": 10000,
            "TIER_B": 100000,
            "TIER_C": 1000000,
        }
        total_target = tier_counts.get(tier, 10000)

        # Step 1: Initialize Golden Vertical Slice C102 ↔ C481 (IMMUTABLE FIXTURE)
        golden_scen = ScenarioGenerator.generate_golden_vertical_slice()

        # Distribution targets
        num_cases = max(5, int(total_target * 0.05))
        num_persons = int(total_target * 0.25)
        num_phones = int(total_target * 0.25)
        num_vehicles = int(total_target * 0.15)
        num_accounts = int(total_target * 0.15)
        num_evidence = int(total_target * 0.15)

        first_names = ["Rajesh", "Amit", "Priya", "Sunil", "Ananya", "Rohan", "Meera", "Deepak", "Karan", "Sanjay"]
        last_names = ["Sharma", "Verma", "Singh", "Gupta", "Kumar", "Patel", "Reddy", "Joshi", "Chawla", "Yadav"]
        cities = ["Delhi NCR / Gurugram", "Gurugram / Haryana", "Noida / UP", "Mumbai", "Bengaluru", "Hyderabad"]

        created_persons: List[Person] = []
        created_phones: List[Phone] = []
        created_vehicles: List[Vehicle] = []
        created_accounts: List[BankAccount] = []

        # Generate Synthetic Persons
        for i in range(1, num_persons + 1):
            pid = f"P-SYN-{self.seed}-{i:05d}"
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            phone_num = f"+91-98{random.randint(10000000, 99999999)}"
            p = Person(
                id=pid,
                first_name=fname,
                last_name=lname,
                aadhaar=f"{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
                source="SYNTHETIC_GENERATOR_FABRIC",
            )
            self.store.save_person(p)
            created_persons.append(p)

        # Generate Synthetic Phones
        for i in range(1, num_phones + 1):
            ph_id = f"PH-SYN-{self.seed}-{i:05d}"
            num = f"+91-97{random.randint(10000000, 99999999)}"
            owner = random.choice(created_persons).id if created_persons else None
            ph = Phone(id=ph_id, phone_number=num, carrier="Airtel", owner_id=owner, source="SYNTHETIC_CDR_ADAPTER")
            self.store.save_phone(ph)
            created_phones.append(ph)

        # Generate Synthetic Vehicles & False-Positive Shared Decoy Structures
        for i in range(1, num_vehicles + 1):
            v_id = f"V-SYN-{self.seed}-{i:05d}"
            reg = f"DL-0{random.randint(1,9)}-AB-{random.randint(1000,9999)}"
            owner = random.choice(created_persons).id if created_persons else None
            v = Vehicle(id=v_id, registration_number=reg, manufacturer="Hyundai", model="Creta", owner_id=owner, source="SYNTHETIC_VAHAN_ADAPTER")
            self.store.save_vehicle(v)
            created_vehicles.append(v)

            # False-Positive Decoy: Legitimate family vehicle sharing
            if owner and random.random() < 0.2:
                second_person = random.choice(created_persons).id
                self.store.register_relationship(
                    second_person,
                    v_id,
                    RelationshipType.USES.value,
                    confidence=0.85,
                    confidence_level=ConfidenceLevel.DOCUMENTED.value,
                    source_system="VAHAN_ADAPTER_SYNTHETIC",
                    reason="Decoy Pattern: Legitimate family vehicle sharing observation",
                )

        # Generate Synthetic Bank Accounts & Transactions
        for i in range(1, num_accounts + 1):
            acc_id = f"ACC-SYN-{self.seed}-{i:05d}"
            acc_num = f"3099{random.randint(10000000, 99999999)}"
            owner = random.choice(created_persons).id if created_persons else None
            acc = BankAccount(id=acc_id, account_number=acc_num, bank_name="State Bank of India", ifsc="SBIN0001020", owner_id=owner, source="SYNTHETIC_FINANCIAL_ADAPTER")
            self.store.save_bank_account(acc)
            created_accounts.append(acc)

        # Generate Synthetic Cases & Evidence
        for i in range(1, num_cases + 1):
            c_id = f"C-SYN-{self.seed}-{i:03d}"
            case_obj = Case(
                id=c_id,
                case_number=f"CASE-2026-{i:04d}",
                title=f"Synthetic Cybercrime Investigation {i}",
                fir_number=f"FIR-2026-{i:04d}",
                crime_type="CYBER_FINANCIAL_FRAUD",
                police_station="Special Cell Cyber Crime",
                source="CCTNS_ADAPTER_SYNTHETIC",
            )
            self.store.save_case(case_obj)

            # Generate associated evidence
            for j in range(1, max(2, num_evidence // num_cases)):
                ev_id = f"EV-SYN-{self.seed}-{i:03d}-{j:02d}"
                ev = Evidence(
                    id=ev_id,
                    evidence_number=f"EVD-2026-{i:03d}-{j:02d}",
                    description=f"Synthetic Digital Evidence Packet #{j}",
                    evidence_type="DIGITAL_FORENSICS",
                    case_id=c_id,
                    source="SYNTHETIC_FORENSIC_ADAPTER",
                )
                self.store.save_evidence(ev)

        return {
            "tier": tier,
            "seed": self.seed,
            "total_nodes": len(self.store.nodes),
            "total_edges": len(self.store.edges),
            "persons_count": len(self.store.persons),
            "cases_count": len(self.store.cases),
            "phones_count": len(self.store.phones),
            "vehicles_count": len(self.store.vehicles),
            "accounts_count": len(self.store.bank_accounts),
            "evidence_count": len(self.store.evidence),
            "golden_scenario": golden_scen,
        }
