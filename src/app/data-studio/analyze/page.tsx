import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("data-studio", "analyze");

export default function Page() {
  return <CapabilityPageContent categorySlug="data-studio" capability="analyze" />;
}
