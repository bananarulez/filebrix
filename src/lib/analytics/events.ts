import type { ProcessingErrorCode } from "@/lib/errors/ProcessingError";

/**
 * Closed set of allowed analytics events. Payloads are fixed interfaces
 * (not `data: unknown`) specifically so a file's contents, filename,
 * cell values, coordinates or generated output can never be attached to
 * an event by accident — see README.txt §38.
 */
export interface PageViewPayload {
  path: string;
}

export interface ToolOpenedPayload {
  toolSlug: string;
}

export interface ProcessingStartedPayload {
  toolSlug: string;
}

export interface ProcessingCompletedPayload {
  toolSlug: string;
  durationMs?: number;
}

export interface ProcessingFailedPayload {
  toolSlug: string;
  /**
   * The `ProcessingError` code itself, not a free-form string: the two
   * vocabularies are the same closed set, and typing this as `string` let
   * them drift (a code added on one side was invisible to the other). It's
   * a fixed enum of failure *kinds* — never a message, which could quote a
   * filename or a cell value.
   */
  errorCode?: ProcessingErrorCode;
}

export interface RelatedToolClickedPayload {
  fromToolSlug: string;
  toToolSlug: string;
}

export type AnalyticsEvent =
  | { name: "page_view"; payload: PageViewPayload }
  | { name: "tool_opened"; payload: ToolOpenedPayload }
  | { name: "processing_started"; payload: ProcessingStartedPayload }
  | { name: "processing_completed"; payload: ProcessingCompletedPayload }
  | { name: "processing_failed"; payload: ProcessingFailedPayload }
  | { name: "related_tool_clicked"; payload: RelatedToolClickedPayload };
