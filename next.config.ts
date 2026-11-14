import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/chat-export", destination: "/upload", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
