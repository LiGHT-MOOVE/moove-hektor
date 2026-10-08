import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"] });

const title = "Moove Hektor";
const description = "Hero banner generator for Moove. Create animated motifs, save projects, and export self-contained animated SVGs.";
const image = {
  url: "/moove-hektor.jpg",
  width: 2262,
  height: 1592,
  alt: "Moove Hektor preview",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://moove-hektor.vercel.app/"),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: title,
    title,
    description,
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="h-full scroll-pt-[calc(42vh+7rem)]"><body className={`${geistSans.className} min-h-full bg-[#f5f4ef] text-slate-950 antialiased`}>{children}</body></html>;
}
