import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("pdf-studio", "metadata");

export default function Page() {
  return <CapabilityPageContent categorySlug="pdf-studio" capability="metadata" />;
}
