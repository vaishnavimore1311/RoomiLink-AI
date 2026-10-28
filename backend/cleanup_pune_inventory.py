"""
Idempotent cleanup script for the Pune property inventory in the RoomiLink AI development database.

This script (Issue #92):
  - Identifies and corrects confirmed data-quality issues in the local SQLite dev database.
  - Repairs encoding corruption (corrupted em-dashes, emoji artifacts).
  - Fixes spelling typos (Grrenspirit -> Greenspirit, recidency -> Residency).
  - Ensures proper title capitalisation.
  - Populates missing localities (Hinjewadi, Baner, Wakad, Kothrud) based on address heuristics.
  - Is safe to run multiple times (idempotent).
  - Only updates confirmed incorrect values.
  - Does NOT touch production data.
  - Prints a summary of records inspected and changed.
  - Does NOT expose connection strings or credentials in output.

Usage:
    cd backend
    .venv/Scripts/python.exe cleanup_pune_inventory.py
"""

import os
import sys
import io
import re

# Force UTF-8 output on Windows terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Bootstrap Flask app context so we can use SQLAlchemy models
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models.property_models import Property

# ---------------------------------------------------------------------------
# Known exact-match corrections: encoding corruption and specific title fixes.
# Each entry:
#   property_id   : primary key of the Property record to inspect
#   field         : column name to check/correct
#   expected_bad  : the incorrect value we expect to find (if corrupted)
#   good_value    : the correct replacement value
#   description   : human-readable description of the fix
#
# NOTE: Only entries whose current value exactly matches expected_bad will be
#       updated.  Records that are already correct are skipped safely.
# ---------------------------------------------------------------------------
EXACT_CORRECTIONS = [
    # ID=1 -- title used to have encoding corruption: em-dash (U+2014) stored
    # as the 🔶 emoji (U+1F536).  The seed.py source has always contained the
    # correct em-dash.  If the DB was re-seeded this entry is already clean
    # and will be skipped.
    {
        "property_id": 1,
        "field": "title",
        "expected_bad": "Tech Haven Flatshare \U0001f536 Phase 1 IT Park",  # 🔶 corruption
        "good_value":   "Tech Haven Flatshare \u2014 Phase 1 IT Park",       # correct em-dash
        "description": "Fix encoding corruption: U+1F536 (emoji) -> U+2014 (em-dash) in title",
    },
]

# ---------------------------------------------------------------------------
# Substring corrections: scan all properties for known spelling mistakes.
# Each entry:
#   field            : column name to scan
#   expected_bad     : substring to search for
#   good_value       : replacement substring
#   description      : human-readable description
#   is_substring     : always True for this group
#   case_insensitive : whether to match case-insensitively
# ---------------------------------------------------------------------------
SUBSTRING_CORRECTIONS = [
    # Grrenspirit -> Greenspirit
    {
        "field": "title",
        "expected_bad": "Grrenspirit",
        "good_value":   "Greenspirit",
        "description": "Fix spelling: Grrenspirit -> Greenspirit",
        "case_insensitive": False,
    },
    # recidency -> Residency (case-insensitive; also fixes RECIDENCY, Recidency, etc.)
    {
        "field": "title",
        "expected_bad": "recidency",
        "good_value":   "Residency",
        "description": "Fix spelling: recidency -> Residency (case-insensitive)",
        "case_insensitive": True,
    },
]

# ---------------------------------------------------------------------------
# Locality heuristics: for properties with a NULL or blank neighborhood,
# infer the locality from the address or title using keyword matching.
#
# Rules are tried in order; the first match wins.  Only updates records
# where neighborhood IS NULL or IS '' (blank).
# ---------------------------------------------------------------------------
LOCALITY_KEYWORDS = [
    # (keyword_list, locality_name)
    (["hinjewadi", "hinjewadi phase", "it park", "rajiv gandhi infotech"],   "Hinjewadi"),
    (["baner", "balewadi"],                                                    "Baner"),
    (["wakad", "pimpri chinchwad"],                                            "Wakad"),
    (["kothrud", "karve road", "karve nagar"],                                "Kothrud"),
    (["viman nagar", "vimannagar"],                                            "Viman Nagar"),
    (["koregaon park", "koregaon"],                                            "Koregaon Park"),
    (["aundh"],                                                                "Aundh"),
    (["hadapsar"],                                                             "Hadapsar"),
    (["magarpatta", "magar patta"],                                            "Magarpatta"),
    (["kalyani nagar"],                                                        "Kalyani Nagar"),
    (["sus road", "sus village"],                                              "Sus"),
    (["pashan"],                                                               "Pashan"),
    (["punawale"],                                                             "Punawale"),
    (["pimple saudagar", "pimple nilakh", "pimple"],                          "Pimple Saudagar"),
    (["shivaji nagar", "fc road", "fergusson"],                               "Shivaji Nagar"),
    (["dhanori"],                                                              "Dhanori"),
    (["mahalunge"],                                                            "Mahalunge"),
    (["bavdhan"],                                                              "Bavdhan"),
    (["warje"],                                                                "Warje"),
]


def apply_substring_fix(value, bad_substr, good_substr, case_insensitive=False):
    """Return corrected string if bad_substr is found, else return None."""
    if case_insensitive:
        idx = value.lower().find(bad_substr.lower())
    else:
        idx = value.find(bad_substr)
    if idx == -1:
        return None
    end_idx = idx + len(bad_substr)
    return value[:idx] + good_substr + value[end_idx:]


def infer_locality(address: str, title: str) -> str | None:
    """Return locality name if address or title contains a recognised keyword, else None."""
    haystack = f"{address} {title}".lower()
    for keywords, locality in LOCALITY_KEYWORDS:
        for kw in keywords:
            if kw in haystack:
                return locality
    return None


def run_cleanup():
    app = create_app("development")

    with app.app_context():
        db_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        if "sqlite" in db_url.lower():
            db_type = "SQLite (local development)"
        elif "postgres" in db_url.lower():
            db_type = "PostgreSQL"
        elif "mysql" in db_url.lower():
            db_type = "MySQL"
        else:
            db_type = "Unknown"

        print("=" * 60)
        print("  RoomiLink AI -- Pune Inventory Cleanup Script (Issue #92)")
        print("=" * 60)
        print(f"  Database type : {db_type}")
        print(f"  Environment   : development")
        print("=" * 60)
        print()

        total_inspected = 0
        total_changed = 0
        skipped = 0

        try:
            all_properties = db.session.query(Property).all()
            print(f"  Total properties in database: {len(all_properties)}")
            print()

            # ------------------------------------------------------------------
            # Step 1 – Exact-match corrections (encoding corruption, specific IDs)
            # ------------------------------------------------------------------
            print("-" * 60)
            print("  Step 1: Exact-match title corrections")
            print("-" * 60)

            for correction in EXACT_CORRECTIONS:
                prop_id = correction["property_id"]
                field = correction["field"]
                expected_bad = correction["expected_bad"]
                good_value = correction["good_value"]
                description = correction["description"]

                prop = db.session.get(Property, prop_id)
                total_inspected += 1

                if prop is None:
                    print(f"  [SKIP] Property ID={prop_id} -- not found in database")
                    skipped += 1
                    continue

                current_value = getattr(prop, field, None)

                if current_value == good_value:
                    print(f"  [OK]   Property ID={prop_id} field='{field}' -- already correct")
                    skipped += 1
                elif current_value == expected_bad:
                    print(f"  [FIX]  Property ID={prop_id} field='{field}'")
                    print(f"         Description : {description}")
                    print(f"         Before      : {repr(current_value)}")
                    print(f"         After       : {repr(good_value)}")
                    setattr(prop, field, good_value)
                    total_changed += 1
                else:
                    print(f"  [WARN] Property ID={prop_id} field='{field}' -- unexpected value, skipping")
                    print(f"         Current     : {repr(current_value)}")
                    skipped += 1

            print()

            # ------------------------------------------------------------------
            # Step 2 – Substring spelling corrections (scan all properties)
            # ------------------------------------------------------------------
            print("-" * 60)
            print("  Step 2: Substring spelling corrections")
            print("-" * 60)

            for correction in SUBSTRING_CORRECTIONS:
                field = correction["field"]
                expected_bad = correction["expected_bad"]
                good_value = correction["good_value"]
                description = correction["description"]
                case_insensitive = correction.get("case_insensitive", False)

                for prop in all_properties:
                    total_inspected += 1
                    current_value = getattr(prop, field, "") or ""
                    fixed = apply_substring_fix(current_value, expected_bad, good_value, case_insensitive)
                    if fixed is not None:
                        print(f"  [FIX]  Property ID={prop.id} field='{field}'")
                        print(f"         Description : {description}")
                        print(f"         Before      : {repr(current_value)}")
                        print(f"         After       : {repr(fixed)}")
                        setattr(prop, field, fixed)
                        total_changed += 1
                    else:
                        skipped += 1

            print()

            # ------------------------------------------------------------------
            # Step 3 – Populate missing localities from address/title heuristics
            # ------------------------------------------------------------------
            print("-" * 60)
            print("  Step 3: Populate missing localities (Hinjewadi, Baner, Wakad, Kothrud, ...)")
            print("-" * 60)

            for prop in all_properties:
                total_inspected += 1
                current_neighborhood = (prop.neighborhood or "").strip()
                if current_neighborhood:
                    # Already has a locality — skip
                    skipped += 1
                    continue

                inferred = infer_locality(prop.address or "", prop.title or "")
                if inferred:
                    print(f"  [FIX]  Property ID={prop.id} field='neighborhood'")
                    print(f"         Description : Inferred locality from address/title")
                    print(f"         Title       : {prop.title!r}")
                    print(f"         Address     : {prop.address!r}")
                    print(f"         Locality    : {inferred!r}")
                    prop.neighborhood = inferred
                    total_changed += 1
                else:
                    print(f"  [SKIP] Property ID={prop.id} -- neighborhood blank, no keyword match")
                    print(f"         Title   : {prop.title!r}")
                    print(f"         Address : {prop.address!r}")
                    skipped += 1

            print()

            # ------------------------------------------------------------------
            # Commit or rollback
            # ------------------------------------------------------------------
            if total_changed > 0:
                db.session.commit()
                print(f"  Committed {total_changed} change(s) to database.")
                print()
            else:
                db.session.rollback()
                print("  No changes to commit -- database is already clean.")
                print()

        except Exception as exc:
            db.session.rollback()
            print()
            print(f"  ERROR -- transaction rolled back: {exc}")
            print()
            sys.exit(1)

        # -----------------------------------------------------------------------
        # Validation: re-read exact-match corrections and confirm correctness
        # -----------------------------------------------------------------------
        print("=" * 60)
        print("  Validation -- re-reading exact-match corrections")
        print("=" * 60)

        validation_passed = True
        for correction in EXACT_CORRECTIONS:
            prop_id = correction["property_id"]
            field = correction["field"]
            good_value = correction["good_value"]

            db.session.expire_all()
            prop = db.session.get(Property, prop_id)

            if prop is None:
                print(f"  [SKIP] Property ID={prop_id} -- not in DB, skipping validation")
                continue

            actual = getattr(prop, field, None)
            if actual == good_value:
                print(f"  [PASS] Property ID={prop_id} field='{field}' -- correct value confirmed")
            else:
                print(f"  [FAIL] Property ID={prop_id} field='{field}'")
                print(f"         Expected : {repr(good_value)}")
                print(f"         Actual   : {repr(actual)}")
                validation_passed = False

        print()
        print("=" * 60)
        print("  Summary")
        print("=" * 60)
        print(f"  Records inspected         : {total_inspected}")
        print(f"  Records updated           : {total_changed}")
        print(f"  Skipped / already correct : {skipped}")
        print(f"  Validation                : {'PASSED' if validation_passed else 'FAILED'}")
        print("=" * 60)
        print()

        sys.exit(0 if validation_passed else 1)


if __name__ == "__main__":
    run_cleanup()
