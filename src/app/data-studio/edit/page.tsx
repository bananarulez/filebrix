import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("data-studio", "edit");

export default function Page() {
  return <CapabilityPageContent categorySlug="data-studio" capability="edit" />;
}
