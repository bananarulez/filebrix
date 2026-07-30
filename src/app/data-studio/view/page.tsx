import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("data-studio", "view");

export default function Page() {
  return <CapabilityPageContent categorySlug="data-studio" capability="view" />;
}
