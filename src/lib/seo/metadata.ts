import type { Metadata } from "next";
import type { ToolDefinition } from "@/registry/types";
import { getToolUrl } from "@/registry";

export const SITE_NAME = "FileBrix";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function buildToolMetadata(tool: ToolDefinition): Metadata {
  const path = getToolUrl(tool);
  const url = `${SITE_URL}${path}`;
  return {
    title: tool.seo.title,
    description: tool.seo.description,
    alternates: { canonical: path },
    openGraph: {
      title: tool.seo.title,
      description: tool.seo.description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: tool.seo.title,
      description: tool.seo.description,
    },
  };
}

export function buildCategoryMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${SITE_URL}${path}`, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

/** The homepage previously inherited only the root layout's bare title/description — no canonical, OpenGraph or Twitter card tags of its own. */
export function buildHomeMetadata(): Metadata {
  const title = "Free Online File Tools That Run in Your Browser";
  const description =
    "Convert, view, edit and analyze files without uploading them. Private by design — your files never leave your device.";
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: SITE_URL, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description },
  };
}
