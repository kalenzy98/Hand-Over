/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep build output reliable on the OneDrive-backed Desktop directory.
  experimental: { cpus: 1 },
};

export default nextConfig;
