import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("pdf-studio", "convert");

export default function Page() {
  return <CapabilityPageContent categorySlug="pdf-studio" capability="convert" />;
}
