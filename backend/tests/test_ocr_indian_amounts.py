"""Amounts on Indian receipts use lakh grouping (2,96,000); the OCR parser must read them whole."""
import pytest

from tarka.ocr.normalization import parse_monetary_amount


@pytest.mark.parametrize(
    "text, expected",
    [
        ("₹2,96,000.00", 296000.0),
        ("₹12,34,567.50", 1234567.5),
        ("₹1,00,000", 100000.0),
        ("2,96,000", 296000.0),
        ("₹76,000.00", 76000.0),
        ("Rs 15,000", 15000.0),
        ("INR 296,000", 296000.0),
        ("₹1,495", 1495.0),
        ("5000", 5000.0),
    ],
)
def test_parse_monetary_amount_indian_and_western(text, expected):
    assert parse_monetary_amount(text) == expected
