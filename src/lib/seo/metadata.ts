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
/*
 * The homepage's title and description are the one place the product's
 * differentiator has to be stated in the words people actually search with.
 *
 * The previous title, "Free Online File Tools That Run in Your Browser",
 * described the *mechanism*. Nobody searches for "runs in my browser" — they
 * search "convert files without uploading", "online converter no upload",
 * "private file converter". "Don't upload your files" says the same thing in
 * the language of the need rather than the implementation, and keeps the
 * category term ("free online file tools") at the front, where it still has
 * to match.
 *
 * Both stay inside what Google renders — roughly 60 characters for the title
 * and 155 for the description — so neither gets truncated mid-phrase.
 */
export function buildHomeMetadata(): Metadata {
  const title = "Free Online File Tools That Don't Upload Your Files";
  const description =
    "Convert, view and edit PDFs, images, spreadsheets and data files without uploading them. Everything runs in your browser — your files never leave your device.";
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: SITE_URL, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description },
  };
}
