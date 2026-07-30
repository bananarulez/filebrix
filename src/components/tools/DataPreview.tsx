import type { ReactNode } from "react";

interface DataPreviewProps {
  children: ReactNode;
  title?: string;
}

export function DataPreview({ children, title }: DataPreviewProps) {
  return (
    <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      {title && <h3 className="mb-2 text-sm font-semibold text-gray-500">{title}</h3>}
      {children}
    </section>
  );
}
