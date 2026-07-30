export interface EditOperationListItem {
  id: string;
  label: string;
}

interface EditOperationListProps {
  steps: EditOperationListItem[];
  emptyMessage?: string;
}

/** Read-only recipe display — the applied-operations trail. Undo/redo controls live in the toolbar (UndoRedoControls) rather than duplicated here, since undo only ever removes the most recent step. */
export function EditOperationList({ steps, emptyMessage = "No edits applied yet." }: EditOperationListProps) {
  if (steps.length === 0) {
    return <p className="text-sm text-gray-400">{emptyMessage}</p>;
  }
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="flex items-baseline gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 dark:border-gray-800"
        >
          <span className="font-mono text-xs text-gray-400">{index + 1}</span>
          <span className="text-gray-700 dark:text-gray-300">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
