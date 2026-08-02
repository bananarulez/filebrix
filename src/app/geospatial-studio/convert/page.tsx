import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("geospatial-studio", "convert");

export default function Page() {
  return <CapabilityPageContent categorySlug="geospatial-studio" capability="convert" />;
}
