import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("pdf-tools", "convert");

export default function Page() {
  return <CapabilityPageContent categorySlug="pdf-tools" capability="convert" />;
}
