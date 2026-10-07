import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moove Hektor Studio",
  description: "Compose animated motifs, save projects, and export self-contained animated SVGs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="h-full scroll-pt-[calc(42vh+7rem)]"><body className={`${geistSans.className} min-h-full bg-[#f5f4ef] text-slate-950 antialiased`}>{children}</body></html>;
}
