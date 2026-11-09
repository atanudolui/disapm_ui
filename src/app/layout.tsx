import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puja Readiness Portal",
  description: "Puja readiness inspection portal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="cds--g10">{children}</body>
    </html>
  );
}
