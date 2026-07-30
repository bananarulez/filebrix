"""Generates tests/fixtures/pdf/encrypted.pdf — a real password-protected
PDF, used to verify the PDF engine fails gracefully (clear ProcessingError,
never a crash, never an attempt to bypass the password) instead of just
mocking encryption. pdf-lib has no encryption-writing support, so this uses
pypdf (pure Python, no compiled deps) instead — a one-time, dev-only fixture
generation step, not a shipped dependency. Run manually:

    python scripts/generate-encrypted-pdf-fixture.py
"""
import os
from pypdf import PdfWriter

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "pdf")

writer = PdfWriter()
writer.add_blank_page(width=595, height=842)
writer.encrypt(user_password="test1234")

out_path = os.path.join(FIXTURES_DIR, "encrypted.pdf")
with open(out_path, "wb") as f:
    writer.write(f)

print(f"wrote {out_path}")
