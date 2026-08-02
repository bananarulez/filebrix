import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudioLayout } from "@/components/studio/StudioLayout";
import type { StudioConfig } from "@/registry/studios";
import { makeTool } from "../helpers/toolFactory";

describe("StudioLayout", () => {
  const relatedTool = makeTool({
    id: "excel-to-csv",
    slug: "excel-to-csv",
    name: "Excel to CSV",
    engine: "spreadsheet",
  });
  const otherEngineTool = makeTool({
    id: "resize-image",
    slug: "resize-image",
    name: "Resize Image",
    engine: "image",
  });
  const studio: StudioConfig = {
    categorySlug: "data-studio",
    title: "Data Studio",
    // Fixed rather than derived: this harness supplies its own two-tool list,
    // so it must not depend on the real registry's size.
    toolCount: 2,
    description: "View, edit, convert and analyze data files — entirely in your browser.",
    engine: "spreadsheet",
    acceptedFileTypes: ["csv", "json"],
    actions: [
      { id: "view", label: "Viewer" },
      { id: "edit", label: "Editor" },
    ],
    defaultAction: "view",
    relatedEngines: ["spreadsheet"],
    faq: [{ question: "Is my file uploaded?", answer: "No, it never leaves your device." }],
  };

  it("renders the application header, description and privacy badge above the fold", () => {
    render(
      <StudioLayout studio={studio} toolList={[relatedTool, otherEngineTool]}>
        <p>the interactive application</p>
      </StudioLayout>
    );

    expect(screen.getByRole("heading", { name: "Data Studio", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(studio.description)).toBeInTheDocument();
    expect(screen.getByText(/processed locally/i)).toBeInTheDocument();
  });

  it("renders the Studio application's own interactive children", () => {
    render(
      <StudioLayout studio={studio} toolList={[relatedTool, otherEngineTool]}>
        <p>the interactive application</p>
      </StudioLayout>
    );
    expect(screen.getByText("the interactive application")).toBeInTheDocument();
  });

  it("renders FAQ items from the Studio's own config", () => {
    render(
      <StudioLayout studio={studio} toolList={[relatedTool, otherEngineTool]}>
        <p>app</p>
      </StudioLayout>
    );
    expect(screen.getByText("Is my file uploaded?")).toBeInTheDocument();
  });

  it("lists related actions only from the Studio's configured engine(s), not every registered tool", () => {
    render(
      <StudioLayout studio={studio} toolList={[relatedTool, otherEngineTool]}>
        <p>app</p>
      </StudioLayout>
    );
    expect(screen.getByRole("link", { name: relatedTool.name })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: otherEngineTool.name })).not.toBeInTheDocument();
  });

  it("breadcrumb shows Home linking to / and the Studio's own name as the current page", () => {
    render(
      <StudioLayout studio={studio} toolList={[relatedTool]}>
        <p>app</p>
      </StudioLayout>
    );
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb.querySelector('a[href="/"]')).toHaveTextContent("Home");
    expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent("Data Studio");
  });
});
