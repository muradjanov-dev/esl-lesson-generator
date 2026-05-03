import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESL Lesson Generator",
  description: "AI-powered ESL lesson generator with interactive whiteboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
