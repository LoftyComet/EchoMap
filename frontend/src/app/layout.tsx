import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sound Memory",
  description: "Listen to the world's stories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
