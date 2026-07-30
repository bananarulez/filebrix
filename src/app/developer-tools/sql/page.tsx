import { DevCategoryPageContent, devCategoryMetadata } from "@/components/developer-toolkit/DevCategoryPageContent";

export const metadata = devCategoryMetadata("sql");

export default function Page() {
  return <DevCategoryPageContent slug="sql" />;
}
