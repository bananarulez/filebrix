import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("image-studio", "edit");

export default function Page() {
  return <CapabilityPageContent categorySlug="image-studio" capability="edit" />;
}
