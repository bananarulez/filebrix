import Link from "next/link";
import { getAppNavItems } from "@/registry/navigation";

export function SiteFooter() {
  const appNavItems = getAppNavItems();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
        <nav aria-label="Applications" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {appNavItems.map((app) => (
            <Link key={app.slug} href={app.href} className="hover:text-gray-900 dark:hover:text-white">
              {app.name}
            </Link>
          ))}
        </nav>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Your files are processed locally in your browser and are never uploaded.
        </p>
      </div>
    </footer>
  );
}
