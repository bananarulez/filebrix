import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("geospatial-tools", "convert");

export default function Page() {
  return <CapabilityPageContent categorySlug="geospatial-tools" capability="convert" />;
}
