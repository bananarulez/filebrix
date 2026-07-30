"""Generates two PDF fixtures the JS toolchain can't produce itself:

  tests/fixtures/pdf/with-xmp.pdf    — carries BOTH an Info dictionary and a
                                      separate XMP metadata stream (the
                                      catalog's /Metadata entry), so the
                                      "Remove Metadata" tool can be proven to
                                      strip both rather than just the Info dict.
  tests/fixtures/pdf/signed.pdf      — carries an AcroForm signature field
                                      (/FT /Sig), so signature *detection* can
                                      be tested against a real structure.

pdf-lib can write neither: it has no XMP API at all, and no signature-field
API. pypdf is pure Python with no compiled deps and is used here for fixture
generation only — dev-only, never shipped — exactly the precedent set by
scripts/generate-encrypted-pdf-fixture.py. Run manually:

    python scripts/generate-pdf-metadata-fixtures.py

Note on signed.pdf: this is a structurally-valid *signature field*, not a
cryptographically valid signature. That is deliberate and sufficient — the
engine only ever detects the field's presence (/FT /Sig) to warn the user
that a signature won't survive processing; it never validates the signature,
so a real certificate would add nothing testable.
"""
import os

from pypdf import PdfWriter, PdfReader
from pypdf.generic import (
    ArrayObject,
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
    TextStringObject,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "pdf")

XMP_PACKET = b"""<?xpacket begin="\xef\xbb\xbf" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">XMPSECRETTITLE</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>XMPSECRETAUTHOR</rdf:li></rdf:Seq></dc:creator>
      <xmp:CreatorTool>XMPSECRETTOOL</xmp:CreatorTool>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""


def build_with_xmp() -> str:
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)

    # 1. A conventional Info dictionary.
    writer.add_metadata(
        {
            "/Title": "INFOSECRETTITLE",
            "/Author": "INFOSECRETAUTHOR",
            "/Subject": "INFOSECRETSUBJECT",
            "/Keywords": "INFOSECRETKEYWORDS",
            "/Creator": "INFOSECRETCREATOR",
            "/Producer": "INFOSECRETPRODUCER",
        }
    )

    # 2. A separate XMP packet, attached as the catalog's /Metadata stream.
    stream = DecodedStreamObject()
    stream.set_data(XMP_PACKET)
    stream[NameObject("/Type")] = NameObject("/Metadata")
    stream[NameObject("/Subtype")] = NameObject("/XML")
    writer._root_object[NameObject("/Metadata")] = writer._add_object(stream)

    out_path = os.path.join(FIXTURES_DIR, "with-xmp.pdf")
    with open(out_path, "wb") as handle:
        writer.write(handle)
    return out_path


def build_signed() -> str:
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)

    # A signature widget annotation doubling as the AcroForm field, which is
    # how signature fields normally appear in a real signed PDF.
    signature_field = DictionaryObject()
    signature_field.update(
        {
            NameObject("/FT"): NameObject("/Sig"),
            NameObject("/Type"): NameObject("/Annot"),
            NameObject("/Subtype"): NameObject("/Widget"),
            NameObject("/T"): TextStringObject("Signature1"),
            NameObject("/F"): NumberObject(132),
            NameObject("/Rect"): ArrayObject(
                [NumberObject(0), NumberObject(0), NumberObject(0), NumberObject(0)]
            ),
        }
    )
    field_ref = writer._add_object(signature_field)

    page = writer.pages[0]
    page[NameObject("/Annots")] = ArrayObject([field_ref])

    acro_form = DictionaryObject()
    acro_form.update(
        {
            NameObject("/Fields"): ArrayObject([field_ref]),
            # SigFlags 3 = SignaturesExist | AppendOnly, what a signed doc sets.
            NameObject("/SigFlags"): NumberObject(3),
        }
    )
    writer._root_object[NameObject("/AcroForm")] = writer._add_object(acro_form)

    out_path = os.path.join(FIXTURES_DIR, "signed.pdf")
    with open(out_path, "wb") as handle:
        writer.write(handle)
    return out_path


for path in (build_with_xmp(), build_signed()):
    size = os.path.getsize(path)
    print(f"wrote {path} ({size} bytes)")

# Read them back so a broken fixture fails here rather than inside a test.
xmp_doc = PdfReader(os.path.join(FIXTURES_DIR, "with-xmp.pdf"))
assert "/Metadata" in xmp_doc.trailer["/Root"], "with-xmp.pdf has no catalog /Metadata"
assert xmp_doc.metadata is not None and xmp_doc.metadata.get("/Title") == "INFOSECRETTITLE"

signed_doc = PdfReader(os.path.join(FIXTURES_DIR, "signed.pdf"))
acro = signed_doc.trailer["/Root"]["/AcroForm"].get_object()
assert acro["/Fields"][0].get_object()["/FT"] == "/Sig", "signed.pdf has no /FT /Sig field"

print("verified: with-xmp.pdf carries Info + XMP; signed.pdf carries an /FT /Sig field")
