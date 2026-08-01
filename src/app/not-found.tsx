import Link from "next/link";
import { getAppNavItems } from "@/registry/navigation";
import { ProseContainer } from "@/components/layout/PageContainer";

// Next.js serves this with a 404 status automatically for any unmatched
// route or explicit notFound() call — no extra wiring needed here.
//
// A pure reading page, so it uses `ProseContainer` directly rather than
// `PageContainer` — it has no wide content to lay out, and it used to
// hardcode the same 54rem the container now owns.
export default function NotFound() {
  return (
    <ProseContainer className="mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-gray-600 dark:text-gray-300">
        We couldn&apos;t find that page. It may have moved, or the link may be out of date — your file
        was never uploaded, since nothing was processed.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to the homepage
      </Link>
      <nav aria-label="Applications" className="flex flex-wrap justify-center gap-3 pt-4">
        {getAppNavItems().map((app) => (
          <Link
            key={app.slug}
            href={app.href}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
          >
            {app.name}
          </Link>
        ))}
      </nav>
    </ProseContainer>
  );
}
