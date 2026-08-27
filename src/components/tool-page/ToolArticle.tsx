import type { ReactNode } from "react";
import { ProseContainer } from "@/components/layout/PageContainer";

/**
 * Long-form reference content below a tool — what the format is, which
 * errors people actually hit, how to read them.
 *
 * Only a handful of pages have one, deliberately. It exists because a few
 * tools answer a question that visitors arrive with already formed ("why is
 * my JSON invalid?"), and answering it on the page is the difference
 * between a tool page and a page worth linking to. Most tools have nothing
 * of the sort to say, and padding them out would produce exactly the thin,
 * templated bulk this is meant to be the opposite of — so the prop is
 * optional and `ToolPageLayout` renders nothing when it's absent.
 *
 * Read, not operated, so it takes the narrow prose measure — same call as
 * `FAQ` and `ToolInstructions`.
 */
export function ToolArticle({ children }: { children: ReactNode }) {
  return (
    <ProseContainer>
      <article
        className="
          flex flex-col gap-3 text-sm leading-relaxed text-gray-600
          dark:text-gray-300
          [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 dark:[&_h2]:text-gray-100
          [&_h3]:mt-4 [&_h3]:font-medium [&_h3]:text-gray-900 dark:[&_h3]:text-gray-100
          [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5
          [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:pl-5
          [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5
          [&_code]:font-mono [&_code]:text-[0.85em] dark:[&_code]:bg-gray-800
          [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-100 [&_pre]:p-3
          [&_pre]:font-mono [&_pre]:text-xs dark:[&_pre]:bg-gray-800
          [&_pre_code]:bg-transparent [&_pre_code]:p-0
        "
      >
        {children}
      </article>
    </ProseContainer>
  );
}
