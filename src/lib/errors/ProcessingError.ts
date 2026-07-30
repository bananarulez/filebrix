export type ProcessingErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "MALFORMED_FILE"
  | "OUT_OF_MEMORY"
  | "WORKER_CRASH"
  | "SUSPECTED_DECOMPRESSION_BOMB"
  /**
   * A worker RPC went past its ceiling without answering — distinct from
   * `WORKER_CRASH`, which is a worker that reported a failure. A timed-out
   * worker never said anything at all (the browser killing it for OOM is
   * the realistic cause), so the only honest claim is "it stopped
   * responding". See `engines/shared/workerClient.ts`.
   */
  | "TIMEOUT";

export interface SerializedProcessingError {
  name: "ProcessingError";
  code: ProcessingErrorCode;
  message: string;
}

/**
 * Error instances don't structured-clone cleanly across a Worker boundary,
 * so engine workers should catch a ProcessingError, call `.toJSON()`, and
 * let the main thread reconstruct it with `fromSerialized`.
 */
export class ProcessingError extends Error {
  readonly code: ProcessingErrorCode;

  constructor(code: ProcessingErrorCode, message: string) {
    super(message);
    this.name = "ProcessingError";
    this.code = code;
  }

  toJSON(): SerializedProcessingError {
    return { name: "ProcessingError", code: this.code, message: this.message };
  }

  static isSerializedProcessingError(value: unknown): value is SerializedProcessingError {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { name?: unknown }).name === "ProcessingError"
    );
  }

  static fromSerialized(value: SerializedProcessingError): ProcessingError {
    return new ProcessingError(value.code, value.message);
  }
}
