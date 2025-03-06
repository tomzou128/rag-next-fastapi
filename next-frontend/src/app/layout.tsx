import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import MainNavigation from "@/components/MainNavigation";
import ThemeRegistry from "@/components/ThemeRegistry";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RAG Document Search",
  description: "Retrieval Augmented Generation for document search and Q&A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry>
          <MainNavigation>{children}</MainNavigation>
        </ThemeRegistry>
      </body>
    </html>
  );
}
