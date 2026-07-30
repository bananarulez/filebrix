import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("pdf-tools", "metadata");

export default function Page() {
  return <CapabilityPageContent categorySlug="pdf-tools" capability="metadata" />;
}
