/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() { return [{ source: "/sw.js", headers: [{key:"Cache-Control",value:"no-cache, no-store, must-revalidate"},{key:"Service-Worker-Allowed",value:"/"}] }]; },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  outputFileTracingIncludes: { "/api/**": ["./public/fonts/*.ttf"] },
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "xkjmurbqltmifbylywea.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "xdcumjsuwmvtiohrqqzu.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "drive.google.com", pathname: "/thumbnail" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
