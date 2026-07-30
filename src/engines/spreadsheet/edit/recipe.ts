import type { NormalizedTable } from "../types";
import {
  deleteColumns,
  deleteRows,
  filterRows,
  findReplace,
  removeDuplicateRows,
  removeEmptyColumns,
  removeEmptyRows,
  renameColumn,
  reorderColumns,
  sortRows,
  trimWhitespace,
  type EditOperation,
} from "./operations";

/** Applies one operation to a table — the single dispatch point every caller (recipe replay, single-step preview) goes through. */
export function applyOperation(table: NormalizedTable, op: EditOperation): NormalizedTable {
  switch (op.type) {
    case "findReplace":
      return findReplace(table, op);
    case "removeEmptyRows":
      return removeEmptyRows(table);
    case "removeEmptyColumns":
      return removeEmptyColumns(table);
    case "deleteRows":
      return deleteRows(table, op);
    case "deleteColumns":
      return deleteColumns(table, op);
    case "renameColumn":
      return renameColumn(table, op);
    case "reorderColumns":
      return reorderColumns(table, op);
    case "sortRows":
      return sortRows(table, op);
    case "filterRows":
      return filterRows(table, op);
    case "removeDuplicateRows":
      return removeDuplicateRows(table);
    case "trimWhitespace":
      return trimWhitespace(table);
  }
}

/**
 * Replays every operation from the untouched original — deliberately not an
 * incremental/cached approach. Table sizes here are already proven fine at
 * 50k rows for a single parse pass (see the CSV Viewer INP measurements in
 * PROJECT_LOG.md); replaying a handful of array operations over that same
 * data on each edit is well within the same budget, and a full recompute is
 * far simpler to reason about and test than incremental diffing.
 */
export function applyRecipe(original: NormalizedTable, operations: EditOperation[]): NormalizedTable {
  return operations.reduce(applyOperation, original);
}

export interface RecipeState {
  original: NormalizedTable;
  applied: EditOperation[];
  /** Operations popped by undo, replayed by redo — cleared by a new "apply" (the standard undo-stack convention: you can't redo past a fresh edit). */
  redoStack: EditOperation[];
}

export type RecipeAction =
  | { type: "apply"; operation: EditOperation }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; original: NormalizedTable };

export function createRecipeState(original: NormalizedTable): RecipeState {
  return { original, applied: [], redoStack: [] };
}

export function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case "apply":
      return { ...state, applied: [...state.applied, action.operation], redoStack: [] };
    case "undo": {
      if (state.applied.length === 0) return state;
      const applied = state.applied.slice(0, -1);
      const undone = state.applied[state.applied.length - 1];
      return { ...state, applied, redoStack: [...state.redoStack, undone] };
    }
    case "redo": {
      if (state.redoStack.length === 0) return state;
      const redoStack = state.redoStack.slice(0, -1);
      const redone = state.redoStack[state.redoStack.length - 1];
      return { ...state, applied: [...state.applied, redone], redoStack };
    }
    case "reset":
      return createRecipeState(action.original);
  }
}

export function currentTable(state: RecipeState): NormalizedTable {
  return applyRecipe(state.original, state.applied);
}

export function canUndo(state: RecipeState): boolean {
  return state.applied.length > 0;
}

export function canRedo(state: RecipeState): boolean {
  return state.redoStack.length > 0;
}

export type { EditOperation } from "./operations";
