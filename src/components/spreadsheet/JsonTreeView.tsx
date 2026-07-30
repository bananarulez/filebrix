"use client";

import { useState } from "react";

interface JsonTreeViewProps {
  value: unknown;
  rootLabel?: string;
  /** Nodes at or beyond this depth start collapsed. Default 1 (root's immediate
   * children visible, everything past that collapsed). */
  defaultExpandDepth?: number;
}

// Real protection against a `RangeError: Maximum call stack size exceeded` on a
// pathologically deep structure (e.g. `[[[[...]]]]` thousands of levels deep) — not
// just a DOM-size limit. Once hit, rendering stops recursing rather than crashing.
const MAX_DEPTH = 40;
// Protects one very wide node (e.g. a 200k-element array) from single-handedly
// blowing up render time even though its siblings are lazily collapsed.
const MAX_CHILDREN = 500;

/**
 * Renders an arbitrary parsed JSON/XML/YAML value (from the value-based pipeline —
 * `parseJsonOrThrow`/`xmlTextToJsonValue`/`parseYamlOrThrow` — never a
 * `NormalizedTable`) as a collapsible tree. No existing precedent in this codebase to
 * build on (confirmed: no tree/disclosure UI pattern exists anywhere else) — the
 * safeguard here is that a collapsed node's children are never mounted into the DOM
 * at all (gated by `{expanded && ...}` below, not just CSS-hidden), so opening a huge
 * file only costs whatever's actually expanded, not the whole structure at once.
 */
export function JsonTreeView({ value, rootLabel, defaultExpandDepth = 1 }: JsonTreeViewProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 p-3 font-mono text-sm dark:border-gray-800">
      <TreeNode label={rootLabel} value={value} depth={0} defaultExpandDepth={defaultExpandDepth} />
    </div>
  );
}

interface TreeNodeProps {
  label?: string;
  value: unknown;
  depth: number;
  defaultExpandDepth: number;
}

function TreeNode({ label, value, depth, defaultExpandDepth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < defaultExpandDepth);

  if (depth >= MAX_DEPTH) {
    return <Leaf label={label} display="… max depth reached" className="italic text-gray-400" />;
  }

  if (value === null || value === undefined) {
    return <Leaf label={label} display="null" className="italic text-gray-400 dark:text-gray-500" />;
  }
  if (typeof value === "string") {
    return <Leaf label={label} display={JSON.stringify(value)} className="text-emerald-700 dark:text-emerald-400" />;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <Leaf label={label} display={String(value)} className="text-blue-700 dark:text-blue-400" />;
  }

  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>);
  const shown = entries.slice(0, MAX_CHILDREN);
  const hiddenCount = entries.length - shown.length;
  const summary = isArray ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-gray-100 dark:hover:bg-gray-900"
      >
        <span aria-hidden className="w-3 shrink-0 text-gray-400">
          {expanded ? "▾" : "▸"}
        </span>
        {label !== undefined && <span className="text-gray-700 dark:text-gray-300">{label}:</span>}
        <span className="text-gray-400">{summary}</span>
      </button>
      {expanded && (
        <div className="ml-3 border-l border-gray-200 pl-3 dark:border-gray-800">
          {shown.map(([key, child]) => (
            <TreeNode key={key} label={key} value={child} depth={depth + 1} defaultExpandDepth={defaultExpandDepth} />
          ))}
          {hiddenCount > 0 && (
            <div className="py-0.5 text-xs italic text-gray-400">{hiddenCount.toLocaleString()} more not shown</div>
          )}
        </div>
      )}
    </div>
  );
}

function Leaf({ label, display, className }: { label?: string; display: string; className: string }) {
  return (
    <div className="py-0.5 pl-4">
      {label !== undefined && <span className="text-gray-700 dark:text-gray-300">{label}: </span>}
      <span className={className}>{display}</span>
    </div>
  );
}
