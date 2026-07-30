import { DevCategoryPageContent, devCategoryMetadata } from "@/components/developer-toolkit/DevCategoryPageContent";

export const metadata = devCategoryMetadata("utilities");

export default function Page() {
  return <DevCategoryPageContent slug="utilities" />;
}
