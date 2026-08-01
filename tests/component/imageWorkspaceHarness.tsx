import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { ImageFilePanel, ImageWorkspace } from "@/components/image/ImageWorkspace";

/**
 * Mounts a single Image Studio tool together with the shared drop zone that
 * now feeds it — same reasoning as `pdfWorkspaceHarness`: the tools became
 * presentational when `ImageWorkspace` took over their file state, and these
 * tests still want to exercise the real drop → detect → tool path.
 */
export function renderWithImageWorkspace(
  ui: ReactElement,
  options: { multiple?: boolean } = {}
): ReturnType<typeof render> {
  return render(
    <ImageWorkspace>
      <ImageFilePanel multiple={options.multiple ?? true} />
      {ui}
    </ImageWorkspace>
  );
}
