import type { Viewport } from "next";
import DialogProvider from "./DialogProvider";
import "./globals.css";

export const metadata = { title: "Woonwarmer voorraad", description: "Kachels vastleggen, terugvinden en op verkocht zetten." };

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b4462b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
