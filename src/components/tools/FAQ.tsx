import type { ToolFaqItem } from "@/registry/types";

export function FAQ({ items }: { items: ToolFaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Frequently asked questions</h2>
      <dl className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.question}>
            <dt className="font-medium">{item.question}</dt>
            <dd className="text-sm text-gray-600 dark:text-gray-300">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
