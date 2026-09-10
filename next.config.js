/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  // Dev-only: proxies /api/* to the Express backend (see /server) so the
  // frontend's existing relative fetch("/api/...") calls work unchanged.
  // Ignored by the static-export production build — that build instead
  // talks directly to NEXT_PUBLIC_API_URL (baked in at build time); see
  // server/DEPLOYMENT.md.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_PROXY_TARGET || "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
