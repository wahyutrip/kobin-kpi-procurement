import type { NextConfig } from "next";

const maxUploadMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 50);

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // two CSV files per upload, plus multipart overhead
      bodySizeLimit: `${maxUploadMb * 2 + 5}mb`,
    },
  },
};

export default nextConfig;
