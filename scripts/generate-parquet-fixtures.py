"""Generates the Parquet test fixtures under tests/fixtures/.

Dev-only tool (uses pandas/pyarrow, not app dependencies) — run manually
whenever fixtures need to be regenerated:

    python scripts/generate-parquet-fixtures.py

The generated files are committed to the repo so tests don't need Python
available to run.
"""

import os
import random
from datetime import datetime, timedelta

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures")
os.makedirs(FIXTURES_DIR, exist_ok=True)


def write(name: str, table: pa.Table) -> None:
    path = os.path.join(FIXTURES_DIR, name)
    pq.write_table(table, path)
    print(f"wrote {path} ({os.path.getsize(path)} bytes)")


# --- valid-basic.parquet: small, multiple types, some NULLs -----------------
random.seed(42)
n = 25
basic = pd.DataFrame(
    {
        "id": list(range(1, n + 1)),
        "name": [f"item-{i}" if i % 7 != 0 else None for i in range(1, n + 1)],
        "price": [round(random.uniform(1, 500), 2) if i % 5 != 0 else None for i in range(1, n + 1)],
        "in_stock": [bool(i % 2) for i in range(1, n + 1)],
        "created_at": [datetime(2024, 1, 1) + timedelta(days=i) for i in range(n)],
    }
)
write("valid-basic.parquet", pa.Table.from_pandas(basic, preserve_index=False))

# --- empty.parquet: defined schema, 0 rows -----------------------------------
empty = pd.DataFrame({"id": pd.Series(dtype="int64"), "name": pd.Series(dtype="object")})
write("empty.parquet", pa.Table.from_pandas(empty, preserve_index=False))

# --- large.parquet: ~100k rows, a handful of columns -------------------------
large_n = 100_000
categories = ["alpha", "beta", "gamma", "delta"]
large = pd.DataFrame(
    {
        "id": range(large_n),
        "category": [categories[i % len(categories)] for i in range(large_n)],
        "value": [(i * 1.5) % 1000 for i in range(large_n)],
    }
)
write("large.parquet", pa.Table.from_pandas(large, preserve_index=False))

# --- malformed.parquet: valid PAR1 header/footer, corrupted footer metadata -
# Passes our client-side magic-byte pre-check (header + trailing magic both
# intact) but must fail inside DuckDB — the more realistic and important
# failure path than plain garbage bytes. Footer layout is
# [FileMetaData thrift blob][4-byte length][4-byte "PAR1"], so corrupting
# bytes inside the thrift blob (not the length or magic) reliably breaks
# deserialization rather than just producing subtly-wrong column values.
valid_path = os.path.join(FIXTURES_DIR, "valid-basic.parquet")
with open(valid_path, "rb") as f:
    data = bytearray(f.read())

footer_length = int.from_bytes(data[-8:-4], byteorder="little")
metadata_start = len(data) - 8 - footer_length
metadata_end = len(data) - 8
mid = (metadata_start + metadata_end) // 2
span = min(32, metadata_end - mid)
for i in range(mid, mid + span):
    data[i] = (data[i] + 137) % 256

malformed_path = os.path.join(FIXTURES_DIR, "malformed.parquet")
with open(malformed_path, "wb") as f:
    f.write(data)
print(f"wrote {malformed_path} ({len(data)} bytes)")
