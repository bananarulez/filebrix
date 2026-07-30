import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { makeTool } from "../helpers/toolFactory";

describe("ToolPageLayout", () => {
  const relatedTool = makeTool({
    id: "excel-to-csv",
    slug: "excel-to-csv",
    name: "Excel to CSV",
    engine: "spreadsheet",
  });
  const tool = makeTool({
    id: "csv-to-excel",
    slug: "csv-to-excel",
    name: "CSV to Excel",
    description: "Convert CSV files to Excel locally in your browser.",
    engine: "spreadsheet",
    relatedTools: ["excel-to-csv"],
    faq: [{ question: "Is my file uploaded?", answer: "No, it never leaves your device." }],
  });

  it("renders the tool title, description and privacy badge above the fold", () => {
    render(
      <ToolPageLayout tool={tool} steps={["Select a file", "Convert", "Download"]}>
        <p>tool interface</p>
      </ToolPageLayout>
    );

    expect(screen.getByRole("heading", { name: "CSV to Excel", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("Convert CSV files to Excel locally in your browser.")
    ).toBeInTheDocument();
    expect(screen.getByText(/processed locally/i)).toBeInTheDocument();
  });

  it("renders the tool's interactive children inside the tool section", () => {
    render(
      <ToolPageLayout tool={tool} steps={["Select a file"]}>
        <p>the interactive widget</p>
      </ToolPageLayout>
    );
    expect(screen.getByText("the interactive widget")).toBeInTheDocument();
  });

  it("links back to the owning category", () => {
    render(
      <ToolPageLayout tool={tool} steps={["Select a file"]}>
        <p>interface</p>
      </ToolPageLayout>
    );
    const backLink = screen.getByRole("link", { name: /data studio/i });
    expect(backLink).toHaveAttribute("href", "/data-studio");
  });

  it("resolves and renders related tools by slug", () => {
    render(
      <ToolPageLayout tool={tool} steps={["Select a file"]} toolList={[tool, relatedTool]}>
        <p>interface</p>
      </ToolPageLayout>
    );
    expect(screen.getByRole("link", { name: relatedTool.name })).toBeInTheDocument();
  });

  it("renders FAQ items when present", () => {
    render(
      <ToolPageLayout tool={tool} steps={["Select a file"]}>
        <p>interface</p>
      </ToolPageLayout>
    );
    expect(screen.getByText("Is my file uploaded?")).toBeInTheDocument();
  });
});
