import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("image-tools", "edit");

export default function Page() {
  return <CapabilityPageContent categorySlug="image-tools" capability="edit" />;
}
