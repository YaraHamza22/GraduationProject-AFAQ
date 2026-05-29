import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Afaq - The Horizon of Learning",
  description: "Experience the future of education with Afaq's immersive 3D learning platform.",
};

import { Providers } from "@/components/providers/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
