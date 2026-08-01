import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("geospatial-studio", "edit");

export default function Page() {
  return <CapabilityPageContent categorySlug="geospatial-studio" capability="edit" />;
}
