import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "LAVIK-Media CRM",
  description: "Minimal mobile-first CRM for leads",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="overflow-x-hidden bg-[color:var(--lavik-bg)] text-[color:var(--lavik-text)]"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden bg-[color:var(--lavik-bg)] text-[color:var(--lavik-text)] pt-[env(safe-area-inset-top)]`}
      >
        {children}
      </body>
    </html>
  );
}
