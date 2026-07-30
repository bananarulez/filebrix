import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("geospatial-tools", "view");

export default function Page() {
  return <CapabilityPageContent categorySlug="geospatial-tools" capability="view" />;
}
