import type { Metadata } from "next";
import { Syne, Bebas_Neue, DM_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Wolfie Delivery — Brooklyn",
  description: "New York's fastest delivery network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${bebasNeue.variable} ${dmMono.variable} antialiased h-full`}>
      <body className="bg-black text-[#e8dcc8] min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
