import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("geospatial-studio", "view");

export default function Page() {
  return <CapabilityPageContent categorySlug="geospatial-studio" capability="view" />;
}
