import Link from "next/link";
import type { DevCategorySlug } from "@/registry/types";
import { DevCategoryIcon } from "./DevCategoryIcon";

interface DevCategoryCardProps {
  slug: DevCategorySlug;
  name: string;
  description: string;
  toolCount: number;
}

export function DevCategoryCard({ slug, name, description, toolCount }: DevCategoryCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-5 dark:border-gray-800">
      <DevCategoryIcon slug={slug} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {toolCount} {toolCount === 1 ? "tool" : "tools"}
        </span>
        <Link
          href={`/developer-tools/${slug}`}
          aria-label={`Open ${name}`}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
