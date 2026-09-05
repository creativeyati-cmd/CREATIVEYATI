/** @type {import('next').NextConfig} */
const nextConfig = {
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
