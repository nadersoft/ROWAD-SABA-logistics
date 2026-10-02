/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // On Vercel, always output to .next (Vercel requires it). Locally, split the
  // dist dir so `next dev -p 3101` (.next) and `next start -p 3001` (.next-prod) can run together.
  distDir: process.env.VERCEL ? '.next' : process.env.NODE_ENV === 'production' ? '.next-prod' : '.next',
};

module.exports = nextConfig;
