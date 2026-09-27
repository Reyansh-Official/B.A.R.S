import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import HomeButton from "@/components/HomeButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "B.A.R.S. · Bill Accessibility & Relief System",
  description: "Turn a hospital bill into a review-ready financial-assistance application.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <HomeButton />
        {children}
      </body>
    </html>
  );
}
