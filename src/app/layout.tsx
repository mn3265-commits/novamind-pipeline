import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovaMind Pipeline",
  description: "AI-powered marketing content pipeline for small creative agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
