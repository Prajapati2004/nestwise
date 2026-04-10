/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.zillowstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.zillow.com',
      },
    ],
  },
};

export default nextConfig;
