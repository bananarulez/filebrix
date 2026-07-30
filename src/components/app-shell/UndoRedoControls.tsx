interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** "Undo before export" falls out of this pair — export always serializes whatever the recipe currently produces, so undoing here is undoing what will be exported. */
export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last edit"
        title="Undo last edit"
        className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white dark:disabled:hover:border-gray-700"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo last undone edit"
        title="Redo"
        className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white dark:disabled:hover:border-gray-700"
      >
        Redo
      </button>
    </div>
  );
}
