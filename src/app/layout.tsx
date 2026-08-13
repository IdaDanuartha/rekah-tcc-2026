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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://rekah.bpbd.madura.com"
  ),
  title: {
    default: "Rekah — Sistem Koordinasi Bantuan Air Bersih Madura",
    template: "%s | Rekah",
  },
  description:
    "Sistem tanggap kekeringan & koordinasi distribusi air bersih berbasis AI di Madura. Laporan warga terstruktur, prioritas darurat cerdas, serta pelacakan pengiriman transparan BPBD.",
  keywords: [
    "air bersih",
    "kekeringan",
    "Madura",
    "BPBD",
    "bantuan air",
    "koordinasi bencana",
    "peta kekeringan",
    "peta air bersih",
    "laporan warga",
    "Pamekasan",
    "Sampang",
    "Bangkalan",
    "Sumenep",
  ],
  authors: [{ name: "BPBD & Tim Rekah" }],
  creator: "Tim Rekah",
  publisher: "BPBD Madura",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/images/logo.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rekah",
  },
  openGraph: {
    title: "Rekah — Sistem Koordinasi Bantuan Air Bersih Madura",
    description:
      "Dari laporan kekeringan warga hingga pengiriman tangki air yang terverifikasi. Transparan, teraudit, dan bisa dipertanggungjawabkan.",
    url: "/",
    siteName: "Rekah Madura",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/images/logo.png",
        width: 512,
        height: 512,
        alt: "Logo Rekah — Sistem Koordinasi Air Bersih Madura",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rekah — Sistem Koordinasi Bantuan Air Bersih Madura",
    description:
      "Platform tanggap darurat kekeringan Madura berbasis AI & transparansi pengiriman air bersih.",
    images: ["/images/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
