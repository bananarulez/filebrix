interface ToolInstructionsProps {
  title?: string;
  steps: string[];
}

export function ToolInstructions({ title = "How it works", steps }: ToolInstructionsProps) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600 dark:text-gray-300">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
