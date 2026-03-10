import type { Metadata } from "next";
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

import { siteConfig } from "./config/site";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

import { ToastProvider } from "./components/Common/Toast";
import { OrganizationProvider } from "./context/OrganizationContext";
import { Toaster } from "@/components/ui/toaster";
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                console.log = function() {};
                console.debug = function() {};
                console.info = function() {};
              `,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextTopLoader color="#4394FF" showSpinner={false} speed={400} />
        <OrganizationProvider>
          <ToastProvider>
            {children}
            <Toaster />
          </ToastProvider>
        </OrganizationProvider>
      </body>
    </html>
  );
}
