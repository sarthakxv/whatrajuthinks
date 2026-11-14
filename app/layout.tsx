import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RouteFooter } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "What Raju Thinks — Your chat, a fresh perspective",
    template: "%s — What Raju Thinks",
  },
  description:
    "The inside jokes. The mixed signals. The things nobody says out loud. Get a fresh perspective on your WhatsApp chats.",
  icons: { icon: "/assets/raju.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="site-content">{children}</div>
        <RouteFooter />
      </body>
    </html>
  );
}
