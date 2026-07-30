export interface Progress {
  percent?: number;
  message?: string;
}

export interface ProcessingOutput {
  filename: string;
  blob: Blob;
}

export interface ProcessingResult {
  outputs: ProcessingOutput[];
  warnings?: string[];
}

export interface ToolProcessor<TOptions = unknown> {
  run(
    input: File | File[],
    options: TOptions,
    onProgress?: (progress: Progress) => void
  ): Promise<ProcessingResult>;
}
