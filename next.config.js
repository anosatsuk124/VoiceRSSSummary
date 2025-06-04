/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Vite を使用している場合は Next.js の dev server は使わない
};

module.exports = nextConfig;
