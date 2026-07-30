import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SideRailAds } from "@/components/layout/SideRailAds";
import { SITE_URL } from "@/lib/seo/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Free Online File Tools That Run in Your Browser",
    template: "%s",
  },
  description:
    "Convert, view, edit and analyze files without uploading them. Private by design — your files never leave your device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <SideRailAds />
      </body>
    </html>
  );
}
