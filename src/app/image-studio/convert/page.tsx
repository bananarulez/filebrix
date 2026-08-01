import { CapabilityPageContent, capabilityMetadata } from "@/components/studio/CapabilityPageContent";

export const metadata = capabilityMetadata("image-studio", "convert");

export default function Page() {
  return <CapabilityPageContent categorySlug="image-studio" capability="convert" />;
}
