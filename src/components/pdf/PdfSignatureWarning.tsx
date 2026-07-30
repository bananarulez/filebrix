/**
 * Advisory notice shown when a loaded PDF carries a digital signature.
 *
 * Deliberately **non-blocking**, and deliberately different from the
 * encrypted-PDF path: an encrypted PDF is a hard `ProcessingError` because
 * pdf-lib genuinely cannot read its content, whereas a signed PDF processes
 * perfectly well — pdf-lib simply doesn't understand signatures, so whatever
 * comes out is unsigned. The user keeps full use of the tool; they just need
 * to know the signature won't survive, which they'd otherwise only discover
 * when a verifier rejected the result.
 *
 * Rendered before the user commits to an operation (right after the file is
 * inspected), not alongside the download, so the warning arrives while it
 * can still change their mind.
 */
export function PdfSignatureWarning() {
  return (
    <p
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <span className="font-medium">This PDF is digitally signed.</span> Editing it here will produce a file
      whose signature is no longer valid — the tools rebuild the document, and a signature only covers the
      exact bytes it was applied to. Everything still works; the output just won&rsquo;t be a signed PDF. Keep
      the original if you need the signature.
    </p>
  );
}
