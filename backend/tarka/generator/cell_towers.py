"""Indian Cell Tower fixture and coordinate lookup."""

from typing import Dict, Any, Optional

# Realistic Indian telecom cell tower identifiers and centroids
INDIAN_CELL_TOWERS: Dict[str, Dict[str, Any]] = {
    # Bengaluru (Karnataka LSA)
    "BLR_MG_ROAD_01": {
        "circle": "KARNATAKA",
        "city": "Bengaluru",
        "site_id": "KA-BLR-0104",
        "cell_id": "404-45-104-1",
        "latitude": 12.9756,
        "longitude": 77.6066,
        "azimuth": 60,
        "coverage_radius_meters": 450.0,
    },
    "BLR_KORAMANGALA_02": {
        "circle": "KARNATAKA",
        "city": "Bengaluru",
        "site_id": "KA-BLR-0218",
        "cell_id": "404-45-218-2",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "azimuth": 180,
        "coverage_radius_meters": 350.0,
    },
    "BLR_AIRPORT_KIA_03": {
        "circle": "KARNATAKA",
        "city": "Bengaluru",
        "site_id": "KA-BLR-0992",
        "cell_id": "404-45-992-1",
        "latitude": 13.1986,
        "longitude": 77.7066,
        "azimuth": 270,
        "coverage_radius_meters": 1200.0,
    },
    # Delhi (Delhi LSA)
    "DEL_CONNAUGHT_PLACE_01": {
        "circle": "DELHI",
        "city": "New Delhi",
        "site_id": "DL-DEL-0051",
        "cell_id": "404-10-051-1",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "azimuth": 0,
        "coverage_radius_meters": 400.0,
    },
    "DEL_IGI_AIRPORT_02": {
        "circle": "DELHI",
        "city": "New Delhi",
        "site_id": "DL-DEL-0899",
        "cell_id": "404-10-899-3",
        "latitude": 28.5562,
        "longitude": 77.1000,
        "azimuth": 120,
        "coverage_radius_meters": 1500.0,
    },
    # Mumbai (Mumbai LSA)
    "MUM_BANDRA_01": {
        "circle": "MUMBAI",
        "city": "Mumbai",
        "site_id": "MH-MUM-0312",
        "cell_id": "404-20-312-1",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "azimuth": 90,
        "coverage_radius_meters": 500.0,
    },
    # Goa (Maharashtra & Goa LSA)
    "GOA_PANJIM_01": {
        "circle": "GOA",
        "city": "Panaji",
        "site_id": "GA-PAN-0101",
        "cell_id": "404-22-101-2",
        "latitude": 15.4909,
        "longitude": 73.8278,
        "azimuth": 240,
        "coverage_radius_meters": 800.0,
    },
    # Kolkata (Kolkata LSA)
    "KOL_PARK_STREET_01": {
        "circle": "KOLKATA",
        "city": "Kolkata",
        "site_id": "WB-KOL-0422",
        "cell_id": "404-30-422-1",
        "latitude": 22.5511,
        "longitude": 88.3528,
        "azimuth": 45,
        "coverage_radius_meters": 600.0,
    },
    # Guwahati (Assam LSA)
    "GUW_PALTAN_BAZAR_01": {
        "circle": "ASSAM",
        "city": "Guwahati",
        "site_id": "AS-GUW-0155",
        "cell_id": "404-70-155-2",
        "latitude": 26.1812,
        "longitude": 91.7511,
        "azimuth": 180,
        "coverage_radius_meters": 750.0,
    },
    # Mysuru (Karnataka LSA)
    "MYS_PALACE_01": {
        "circle": "KARNATAKA",
        "city": "Mysuru",
        "site_id": "KA-MYS-0077",
        "cell_id": "404-45-077-1",
        "latitude": 12.3052,
        "longitude": 76.6552,
        "azimuth": 300,
        "coverage_radius_meters": 500.0,
    },
}


def get_cell_tower(tower_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves cell tower metadata by ID."""
    return INDIAN_CELL_TOWERS.get(tower_id)
