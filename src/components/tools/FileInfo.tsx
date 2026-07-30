import { FileTypeBadge } from "./FileTypeBadge";
import { formatBytes } from "@/lib/format/bytes";

interface FileInfoProps {
  file: File;
  detectedFormat?: string;
}

export function FileInfo({ file, detectedFormat }: FileInfoProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
      <span className="font-medium">{file.name}</span>
      <span className="text-gray-500">{formatBytes(file.size)}</span>
      {detectedFormat && <FileTypeBadge format={detectedFormat} />}
    </div>
  );
}
