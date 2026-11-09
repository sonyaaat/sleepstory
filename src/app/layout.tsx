import type { Metadata, Viewport } from "next";
import { Figtree, Russo_One } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const russo = Russo_One({ variable: "--font-russo", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "SleepStory",
  description: "A 60-second morning sleep check-in and a one-page Sleep Snapshot for your primary care provider.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#2b1c6f" },
    { media: "(prefers-color-scheme: light)", color: "#faf9fe" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${russo.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {/* Night theme by default, like the reference design; testers can switch in the demo bar. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
