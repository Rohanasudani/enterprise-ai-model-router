import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Model Router",
  description: "Evaluate and route LLM workloads by quality, cost, latency, and context fit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
