import { DevCategoryPageContent, devCategoryMetadata } from "@/components/developer-toolkit/DevCategoryPageContent";

export const metadata = devCategoryMetadata("encoding");

export default function Page() {
  return <DevCategoryPageContent slug="encoding" />;
}
