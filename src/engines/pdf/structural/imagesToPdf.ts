import { PDFDocument, type PDFImage } from "pdf-lib";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { toPdfProcessingError } from "./load";

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** One page per image, sized to the image's own pixel dimensions so mixed
 * image sizes/aspect ratios are preserved without letterboxing or cropping. */
export async function buildPdfFromImages(images: (Uint8Array | ArrayBuffer)[]): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new ProcessingError("MALFORMED_FILE", "No images selected. Choose at least one image to continue.");
  }

  try {
    const output = await PDFDocument.create();

    for (const imageBytes of images) {
      const bytes = imageBytes instanceof Uint8Array ? imageBytes : new Uint8Array(imageBytes);
      let embedded: PDFImage;
      if (isPng(bytes)) {
        embedded = await output.embedPng(bytes);
      } else if (isJpeg(bytes)) {
        embedded = await output.embedJpg(bytes);
      } else {
        throw new ProcessingError(
          "UNSUPPORTED_FORMAT",
          "Only PNG and JPEG images can be converted to PDF."
        );
      }

      const page = output.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    }

    return await output.save();
  } catch (cause) {
    throw toPdfProcessingError(cause);
  }
}
