import Link from "next/link";
import type { ToolDefinition } from "@/registry/types";
import { getToolUrl } from "@/registry";

export function RelatedTools({ tools }: { tools: ToolDefinition[] }) {
  if (tools.length === 0) return null;
  return (
    <nav aria-label="Related tools" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-500">Related tools</h2>
      <ul className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              href={getToolUrl(tool)}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm hover:border-blue-400 hover:text-blue-600 dark:border-gray-700"
            >
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
