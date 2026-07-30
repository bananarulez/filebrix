"use client";

import { useState } from "react";
import type { EditOperation, FilterOperator, SortDirection } from "@/engines/spreadsheet/edit/operations";

interface AddOperationPanelProps {
  columns: string[];
  onApply: (operation: EditOperation) => void;
}

const OP_LABELS: Record<EditOperation["type"], string> = {
  findReplace: "Find & replace",
  removeEmptyRows: "Remove empty rows",
  removeEmptyColumns: "Remove empty columns",
  deleteRows: "Delete rows",
  deleteColumns: "Delete columns",
  renameColumn: "Rename column",
  reorderColumns: "Reorder columns",
  sortRows: "Sort",
  filterRows: "Filter",
  removeDuplicateRows: "Remove duplicate rows",
  trimWhitespace: "Trim whitespace",
};

const SELECT_CLASS =
  "w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900";
const INPUT_CLASS = SELECT_CLASS;
const BUTTON_CLASS =
  "w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function parseIndexList(text: string): number[] {
  return text
    .split(",")
    .map((part) => Number(part.trim()) - 1)
    .filter((n) => Number.isInteger(n) && n >= 0);
}

/** One "add an edit operation" form, adapting its fields to the selected operation type. Every field change stays local until "Apply" — nothing mutates the table until the user commits a step. */
export function AddOperationPanel({ columns, onApply }: AddOperationPanelProps) {
  const [opType, setOpType] = useState<EditOperation["type"]>("findReplace");

  // Shared, reset-on-type-change field state, kept simple as one flat record
  // rather than per-type state slices — this panel only ever has one active
  // operation's fields visible at a time.
  const [columnIndex, setColumnIndex] = useState<string>("all");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [rowIndicesText, setRowIndicesText] = useState("");
  const [columnCheckboxes, setColumnCheckboxes] = useState<Set<number>>(new Set());
  const [newName, setNewName] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterOperator, setFilterOperator] = useState<FilterOperator>("contains");
  const [filterValue, setFilterValue] = useState("");
  const [order, setOrder] = useState<number[]>(() => columns.map((_, i) => i));

  function resetFields(nextType: EditOperation["type"]) {
    setOpType(nextType);
    setFind("");
    setReplace("");
    setRowIndicesText("");
    setColumnCheckboxes(new Set());
    setNewName("");
    setFilterValue("");
    setOrder(columns.map((_, i) => i));
  }

  function moveOrderItem(position: number, delta: number) {
    setOrder((prev) => {
      const next = prev.slice();
      const target = position + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  }

  function handleApply() {
    const parsedColumnIndex = columnIndex === "all" ? null : Number(columnIndex);
    switch (opType) {
      case "findReplace":
        if (!find) return;
        onApply({ type: "findReplace", columnIndex: parsedColumnIndex, find, replace, matchCase });
        return;
      case "removeEmptyRows":
        onApply({ type: "removeEmptyRows" });
        return;
      case "removeEmptyColumns":
        onApply({ type: "removeEmptyColumns" });
        return;
      case "deleteRows": {
        const indices = parseIndexList(rowIndicesText);
        if (indices.length === 0) return;
        onApply({ type: "deleteRows", indices });
        return;
      }
      case "deleteColumns": {
        if (columnCheckboxes.size === 0) return;
        onApply({ type: "deleteColumns", indices: [...columnCheckboxes] });
        return;
      }
      case "renameColumn": {
        if (parsedColumnIndex === null || !newName.trim()) return;
        onApply({ type: "renameColumn", index: parsedColumnIndex, name: newName });
        return;
      }
      case "reorderColumns":
        onApply({ type: "reorderColumns", order });
        return;
      case "sortRows": {
        if (parsedColumnIndex === null) return;
        onApply({ type: "sortRows", columnIndex: parsedColumnIndex, direction: sortDirection });
        return;
      }
      case "filterRows": {
        if (parsedColumnIndex === null) return;
        onApply({ type: "filterRows", columnIndex: parsedColumnIndex, operator: filterOperator, value: filterValue || undefined });
        return;
      }
      case "removeDuplicateRows":
        onApply({ type: "removeDuplicateRows" });
        return;
      case "trimWhitespace":
        onApply({ type: "trimWhitespace" });
    }
  }

  const needsColumnPicker = opType === "renameColumn" || opType === "sortRows" || opType === "filterRows";
  const needsValueFields = opType === "filterRows" && filterOperator !== "empty" && filterOperator !== "notEmpty";

  return (
    <div className="flex flex-col gap-2.5">
      <select
        value={opType}
        onChange={(event) => resetFields(event.target.value as EditOperation["type"])}
        className={SELECT_CLASS}
        aria-label="Operation type"
      >
        {(Object.keys(OP_LABELS) as EditOperation["type"][]).map((type) => (
          <option key={type} value={type}>
            {OP_LABELS[type]}
          </option>
        ))}
      </select>

      {opType === "findReplace" && (
        <>
          <select value={columnIndex} onChange={(e) => setColumnIndex(e.target.value)} className={SELECT_CLASS} aria-label="Column">
            <option value="all">All columns</option>
            {columns.map((col, i) => (
              <option key={col} value={i}>
                {col}
              </option>
            ))}
          </select>
          <input className={INPUT_CLASS} placeholder="Find" value={find} onChange={(e) => setFind(e.target.value)} />
          <input className={INPUT_CLASS} placeholder="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
            Match case
          </label>
        </>
      )}

      {opType === "deleteRows" && (
        <input
          className={INPUT_CLASS}
          placeholder="Row numbers, e.g. 1, 3, 5"
          value={rowIndicesText}
          onChange={(e) => setRowIndicesText(e.target.value)}
        />
      )}

      {opType === "deleteColumns" && (
        <fieldset className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
          {columns.map((col, i) => (
            <label key={col} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={columnCheckboxes.has(i)}
                onChange={(e) =>
                  setColumnCheckboxes((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(i);
                    else next.delete(i);
                    return next;
                  })
                }
              />
              {col}
            </label>
          ))}
        </fieldset>
      )}

      {opType === "reorderColumns" && (
        <ol className="flex flex-col gap-1 text-sm">
          {order.map((colIndex, position) => (
            <li key={colIndex} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2 py-1 dark:border-gray-800">
              <span className="truncate">{columns[colIndex]}</span>
              <span className="flex gap-1">
                <button type="button" aria-label={`Move ${columns[colIndex]} up`} onClick={() => moveOrderItem(position, -1)} className="px-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  ↑
                </button>
                <button type="button" aria-label={`Move ${columns[colIndex]} down`} onClick={() => moveOrderItem(position, 1)} className="px-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {needsColumnPicker && (
        <select value={columnIndex === "all" ? "" : columnIndex} onChange={(e) => setColumnIndex(e.target.value)} className={SELECT_CLASS} aria-label="Column">
          <option value="" disabled>
            Choose a column…
          </option>
          {columns.map((col, i) => (
            <option key={col} value={i}>
              {col}
            </option>
          ))}
        </select>
      )}

      {opType === "renameColumn" && (
        <input className={INPUT_CLASS} placeholder="New name" value={newName} onChange={(e) => setNewName(e.target.value)} />
      )}

      {opType === "sortRows" && (
        <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value as SortDirection)} className={SELECT_CLASS} aria-label="Sort direction">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      )}

      {opType === "filterRows" && (
        <>
          <select value={filterOperator} onChange={(e) => setFilterOperator(e.target.value as FilterOperator)} className={SELECT_CLASS} aria-label="Filter condition">
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="greaterThan">Greater than</option>
            <option value="lessThan">Less than</option>
            <option value="empty">Is empty</option>
            <option value="notEmpty">Is not empty</option>
          </select>
          {needsValueFields && (
            <input className={INPUT_CLASS} placeholder="Value" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
          )}
        </>
      )}

      <button type="button" onClick={handleApply} className={BUTTON_CLASS}>
        Apply
      </button>
    </div>
  );
}
