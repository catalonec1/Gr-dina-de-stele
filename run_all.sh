#!/bin/sh
# Rebuild every product and run all automatic checks.
set -e
cd "$(dirname "$0")"
python3 generator/build.py
python3 generator/build_sheets.py
python3 generator/sheet_images.py
python3 generator/listings.py
python3 tests/test_products.py
python3 tests/test_sheets.py | tail -1
