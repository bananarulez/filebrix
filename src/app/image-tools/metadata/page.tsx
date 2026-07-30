import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("image-tools", "metadata");

export default function Page() {
  return <CapabilityPageContent categorySlug="image-tools" capability="metadata" />;
}
