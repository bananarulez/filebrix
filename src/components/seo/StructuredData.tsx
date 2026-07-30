/**
 * Renders JSON-LD. `data` must always come from lib/seo/structuredData.ts
 * builders (internally generated data) — never pass raw file/user content
 * through this component, since it's serialized straight into the DOM.
 */
export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
