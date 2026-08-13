import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rekah — Sistem Koordinasi Air Bersih Madura",
  description:
    "Sistem koordinasi bantuan air bersih kekeringan di Madura. Laporan terstruktur, prioritas berbasis AI, verifikasi terverifikasi.",
  keywords: ["air bersih", "kekeringan", "Madura", "BPBD", "bantuan", "koordinasi"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rekah",
  },
  openGraph: {
    title: "Rekah — Koordinasi Air Bersih Madura",
    description:
      "Dari laporan kekeringan ke pengiriman air yang terverifikasi. Transparan, teraudit, bisa dipertanggungjawabkan.",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
