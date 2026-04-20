import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AdminCrumb } from "@/components/admin-crumb";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "hmcatcher",
  description: "A hellomirrors web application",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={cn("font-sans", outfit.variable)}
      lang="de"
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <AdminCrumb />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
