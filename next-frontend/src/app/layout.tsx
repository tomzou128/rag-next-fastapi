import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import theme from "@/app/theme";
import MainNavigation from "@/components/MainNavigation";

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
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MainNavigation>{children}</MainNavigation>
        </ThemeProvider>
      </body>
    </html>
  );
}
