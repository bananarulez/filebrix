import { describe, expect, it } from "vitest";
import {
  applyRecipe,
  canRedo,
  canUndo,
  createRecipeState,
  currentTable,
  recipeReducer,
  type RecipeState,
} from "@/engines/spreadsheet/edit/recipe";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

const ORIGINAL: NormalizedTable = {
  columns: ["a", "b"],
  rows: [
    [1, "x"],
    [2, "y"],
    [3, "z"],
  ],
  warnings: [],
};

describe("applyRecipe", () => {
  it("replays operations in order from the untouched original", () => {
    const result = applyRecipe(ORIGINAL, [
      { type: "deleteRows", indices: [0] },
      { type: "sortRows", columnIndex: 0, direction: "desc" },
    ]);
    expect(result.rows).toEqual([[3, "z"], [2, "y"]]);
  });

  it("returns the original unchanged for an empty operation list", () => {
    expect(applyRecipe(ORIGINAL, [])).toEqual(ORIGINAL);
  });
});

describe("recipeReducer", () => {
  function apply(state: RecipeState, op: Parameters<typeof recipeReducer>[1]) {
    return recipeReducer(state, op);
  }

  it("apply appends an operation and clears the redo stack", () => {
    let state = createRecipeState(ORIGINAL);
    state = apply(state, { type: "apply", operation: { type: "removeDuplicateRows" } });
    expect(state.applied).toHaveLength(1);
    expect(state.redoStack).toEqual([]);
  });

  it("undo moves the last applied operation onto the redo stack", () => {
    let state = createRecipeState(ORIGINAL);
    state = apply(state, { type: "apply", operation: { type: "trimWhitespace" } });
    state = apply(state, { type: "undo" });
    expect(state.applied).toEqual([]);
    expect(state.redoStack).toHaveLength(1);
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(true);
  });

  it("redo replays the most recently undone operation", () => {
    let state = createRecipeState(ORIGINAL);
    state = apply(state, { type: "apply", operation: { type: "sortRows", columnIndex: 0, direction: "desc" } });
    state = apply(state, { type: "undo" });
    state = apply(state, { type: "redo" });
    expect(state.applied).toEqual([{ type: "sortRows", columnIndex: 0, direction: "desc" }]);
    expect(state.redoStack).toEqual([]);
  });

  it("a new apply after an undo clears the redo stack (can't redo past a fresh edit)", () => {
    let state = createRecipeState(ORIGINAL);
    state = apply(state, { type: "apply", operation: { type: "trimWhitespace" } });
    state = apply(state, { type: "undo" });
    state = apply(state, { type: "apply", operation: { type: "removeDuplicateRows" } });
    expect(canRedo(state)).toBe(false);
  });

  it("undo/redo on an empty history are no-ops, not crashes", () => {
    const state = createRecipeState(ORIGINAL);
    expect(apply(state, { type: "undo" })).toEqual(state);
    expect(apply(state, { type: "redo" })).toEqual(state);
  });

  it("reset replaces the original and clears all history", () => {
    let state = createRecipeState(ORIGINAL);
    state = apply(state, { type: "apply", operation: { type: "trimWhitespace" } });
    const other: NormalizedTable = { columns: ["z"], rows: [], warnings: [] };
    state = apply(state, { type: "reset", original: other });
    expect(state).toEqual(createRecipeState(other));
  });

  it("currentTable reflects applyRecipe(original, applied) exactly, giving live preview + undo-before-export for free", () => {
    let state = createRecipeState(ORIGINAL);
    state = apply(state, { type: "apply", operation: { type: "deleteRows", indices: [1] } });
    expect(currentTable(state)).toEqual(applyRecipe(ORIGINAL, state.applied));
    expect(currentTable(state).rows).toEqual([[1, "x"], [3, "z"]]);
  });
});
