import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company Profiles Admin",
  description: "Admin UI for managing company profiles",
  icons: {
    icon: [{ url: "/Candidate-Favicon.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
