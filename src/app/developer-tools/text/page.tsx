import { DevCategoryPageContent, devCategoryMetadata } from "@/components/developer-toolkit/DevCategoryPageContent";

export const metadata = devCategoryMetadata("text");

export default function Page() {
  return <DevCategoryPageContent slug="text" />;
}
