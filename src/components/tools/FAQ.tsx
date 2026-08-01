import type { ToolFaqItem } from "@/registry/types";
import { ProseContainer } from "@/components/layout/PageContainer";

/**
 * Answers are wrapped in `ProseContainer` (54rem) rather than filling the
 * page's full application width. The container is applied *here*, in the
 * shared component, not at each of the ~9 call sites — every page that
 * renders an FAQ gets a readable measure automatically, and a new one can't
 * forget. Same reasoning as `ToolInstructions`.
 */
export function FAQ({ items }: { items: ToolFaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <ProseContainer>
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
    </ProseContainer>
  );
}
