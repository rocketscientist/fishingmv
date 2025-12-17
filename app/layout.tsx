
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Maldives Tuna — Industry Dashboard",
  description: "Local vs global price • Subsidy & revenue • Purchases & exports",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">{children}</body>
    </html>
  );
}
