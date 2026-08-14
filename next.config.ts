import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sembunyikan indikator dev on-screen (lingkaran "N" mengambang saat dev)
  devIndicators: false,
  experimental: {
    serverActions: {
      // Default 1MB kekecilan utk foto bukti serah terima (cap 8MB di action).
      // Tanpa ini: 413 "Body exceeded 1 MB limit" → crash React #441.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
